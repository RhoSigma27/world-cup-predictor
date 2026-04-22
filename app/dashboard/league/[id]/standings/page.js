import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PointsChart from './PointsChart'

// ─── Scoring Engine ───────────────────────────────────────────
function getResult(s1, s2) {
  if (s1 > s2) return 'H'
  if (s2 > s1) return 'A'
  return 'D'
}

// R32 matches that host a 3rd-place team (Annex C slot positions)
// matchNumber → column index in the Annex C row
const ANNEX_C_R32_MATCHES = new Set([74, 77, 79, 80, 81, 82, 85, 87])

function scoreParticipant(predictions, fixtures, extrasPred, masterExtras, effectiveThirdPlaceGroups = []) {
  let groupPts = 0, koPts = 0, extrasPts = 0

  // Build per-round star pick map from new columns
  const starPicks = {
    group: extrasPred?.star_pick_group ?? null,
    R32:   extrasPred?.star_pick_r32   ?? null,
    R16:   extrasPred?.star_pick_r16   ?? null,
    QF:    extrasPred?.star_pick_qf    ?? null,
    SF:    extrasPred?.star_pick_sf    ?? null,
    FINAL: extrasPred?.star_pick_final ?? null,
  }

  for (const f of fixtures) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predictions.find(p => p.fixture_id === f.id)
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    // For KO matches with a penalty winner, treat as +1 for scoring purposes
    // e.g. 1-1 with home winning pens → treat as 2-1 for result/score comparison
    let effectiveHome = f.home_score
    let effectiveAway = f.away_score
    if (f.penalty_winner && f.home_score === f.away_score) {
      if (f.penalty_winner === f.home_team) effectiveHome += 1
      else effectiveAway += 1
    }

    const masterResult = getResult(effectiveHome, effectiveAway)
    const predResult = getResult(pred.predicted_home, pred.predicted_away)

    if (masterResult !== predResult) continue

    const roundPoints = {
      group: [10, 5],
      R32: [10, 5],
      R16: [20, 10],
      QF: [30, 15],
      SF: [50, 25],
      '3RD': [80, 40],
      FINAL: [80, 40],
    }

    const [base, bonus] = roundPoints[f.round] || [0, 0]
    let pts = base
    if (pred.predicted_home === effectiveHome && pred.predicted_away === effectiveAway) {
      pts += bonus
    }

    // Star pick doubles points — use the pick for this specific round
    const roundKey = f.round === '3RD' ? 'FINAL' : f.round // bronze uses FINAL pick
    const starPick = starPicks[roundKey] ?? null
    const teamInvolved = f.home_team === starPick || f.away_team === starPick
    if (starPick && teamInvolved) pts *= 2

    if (f.round === 'group') groupPts += pts
    else koPts += pts
  }

  // Extras scoring
  if (masterExtras) {
    if (masterExtras.total_red_cards != null && extrasPred?.predicted_red_cards != null) {
      const diff = Math.abs(masterExtras.total_red_cards - extrasPred.predicted_red_cards)
      extrasPts += diff === 0 ? 50 : Math.max(0, 50 - diff * 5)
    }
    if (masterExtras.total_goals != null && extrasPred?.predicted_total_goals != null) {
      const diff = Math.abs(masterExtras.total_goals - extrasPred.predicted_total_goals)
      extrasPts += diff === 0 ? 50 : Math.max(0, 50 - diff * 2)
    }
  }

  return {
    total: groupPts + koPts + extrasPts,
    groupPts,
    koPts,
    extrasPts,
  }
}

export default async function StandingsPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  // Get league
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) redirect('/dashboard')

  // Get all fixtures with real results
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  // Get all league members with profiles
  const { data: members } = await adminSupabase
    .from('league_members')
    .select(`
      user_id,
      joined_at,
      profiles (
        display_name
      )
    `)
    .eq('league_id', id)

  // Get global master extras (single row, no league filter)
  const { data: masterExtras } = await supabase
    .from('master_extras')
    .select('*')
    .single()

  // Determine the effective 3rd-place qualifying groups:
  // If admin has set a manual override, use that; otherwise derive from real scores.
  // This is used to correctly identify which 3rd-place team slot each R32 fixture
  // belongs to when applying star-pick bonuses and future bracket logic.
  const effectiveThirdPlaceGroups = masterExtras?.third_place_override
    ? masterExtras.third_place_override  // e.g. ['C','F','G','H','I','J','K','L']
    : (() => {
        // Auto-compute from completed group fixtures
        const groupFixtures = fixtures?.filter(f => f.round === 'group') || []
        const groupStats = {}
        for (const f of groupFixtures) {
          if (f.home_score == null || f.away_score == null) continue
          const g = f.match_group
          if (!groupStats[g]) {
            groupStats[g] = {}
          }
          for (const [team, gf, ga] of [
            [f.home_team, f.home_score, f.away_score],
            [f.away_team, f.away_score, f.home_score],
          ]) {
            if (!groupStats[g][team]) groupStats[g][team] = { pts: 0, gd: 0, gf: 0, played: 0 }
            const s = groupStats[g][team]
            s.played++; s.gf += gf; s.ga += ga; s.gd += gf - ga
            if (gf > ga) s.pts += 3
            else if (gf === ga) s.pts += 1
          }
        }
        // Get 3rd-place team per group, then rank by pts/gd/gf, take top 8
        const thirds = Object.entries(groupStats).map(([g, teams]) => {
          const sorted = Object.entries(teams)
            .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
          return sorted[2] ? { group: g, ...(sorted[2][1]) } : null
        }).filter(Boolean)
        thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
        return thirds.slice(0, 8).map(t => t.group)
      })()

  // Get all predictions for this league
  const { data: allPredictions } = await adminSupabase
    .from('predictions')
    .select('*')
    .eq('league_id', id)

  // Get all extras predictions for this league
  const { data: allExtras } = await adminSupabase
    .from('extras_predictions')
    .select('*')
    .eq('league_id', id)

  // Calculate scores for each member
  const standings = members?.map(member => {
    const userPreds = allPredictions?.filter(p => p.user_id === member.user_id) || []
    const userExtras = allExtras?.find(e => e.user_id === member.user_id) || null

    const score = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras, effectiveThirdPlaceGroups)
    const filled = userPreds.filter(p => p.predicted_home != null && p.predicted_away != null).length

    return {
      userId: member.user_id,
      displayName: member.profiles?.display_name,
      isAdmin: member.user_id === league.admin_id,
      isCurrentUser: member.user_id === user.id,
      starPicks: {
        group: userExtras?.star_pick_group ?? null,
        R32:   userExtras?.star_pick_r32   ?? null,
        R16:   userExtras?.star_pick_r16   ?? null,
        QF:    userExtras?.star_pick_qf    ?? null,
        SF:    userExtras?.star_pick_sf    ?? null,
        FINAL: userExtras?.star_pick_final ?? null,
      },
      filled,
      ...score,
    }
  }) || []

  // Sort by total points
  standings.sort((a, b) => b.total - a.total || b.groupPts - a.groupPts)

  // Assign places
  let place = 1
  standings.forEach((s, i) => {
    if (i > 0 && s.total !== standings[i - 1].total) place = i + 1
    s.place = place
  })

  const resultsEntered = fixtures?.filter(f => f.home_score != null && f.away_score != null).length || 0

  // Build chart data — cumulative points per player per match
  const completedFixtures = fixtures
    .filter(f => f.home_score != null && f.away_score != null)
    .sort((a, b) => a.match_number - b.match_number)

  const chartData = completedFixtures.map((f, idx) => {
    const point = { match: f.match_number }
    standings.forEach(s => {
      // Find this player's prediction for this fixture
      const pred = allPredictions?.find(p => p.user_id === s.userId && p.fixture_id === f.id)
      if (!pred || pred.predicted_home == null || pred.predicted_away == null) {
        point[s.displayName] = idx === 0 ? 0 : null
        return
      }
      const masterResult = getResult(f.home_score, f.away_score)
      const predResult = getResult(pred.predicted_home, pred.predicted_away)

      // Apply penalty winner adjustment for KO draws
      let effectiveHome = f.home_score
      let effectiveAway = f.away_score
      if (f.penalty_winner && f.home_score === f.away_score) {
        if (f.penalty_winner === f.home_team) effectiveHome += 1
        else effectiveAway += 1
      }
      const effectiveMasterResult = getResult(effectiveHome, effectiveAway)
      const effectivePredResult = getResult(pred.predicted_home, pred.predicted_away)

      if (effectiveMasterResult !== effectivePredResult) {
        point[s.displayName] = 0
        return
      }
      const roundPoints = {
        group: [10, 5], R32: [10, 5], R16: [20, 10],
        QF: [30, 15], SF: [50, 25], '3RD': [80, 40], FINAL: [80, 40],
      }
      const [base, bonus] = roundPoints[f.round] || [0, 0]
      let pts = base
      if (pred.predicted_home === effectiveHome && pred.predicted_away === effectiveAway) pts += bonus
      const chartRoundKey = f.round === '3RD' ? 'FINAL' : f.round
      const chartStarPick = s.starPicks?.[chartRoundKey] ?? null
      if (chartStarPick && (f.home_team === chartStarPick || f.away_team === chartStarPick)) pts *= 2
      point[s.displayName] = pts
    })
    return point
  })

  // Convert to cumulative
  const cumulativeChart = chartData.map((point, idx) => {
    const cumPoint = { match: point.match }
    standings.forEach(s => {
      const prev = idx > 0 ? (cumulativeChart[idx - 1]?.[s.displayName] || 0) : 0
      cumPoint[s.displayName] = prev + (point[s.displayName] || 0)
    })
    return cumPoint
  })

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/dashboard/league/${id}`} className="text-gray-400 hover:text-white text-sm">
          ← {league.league_name}
        </Link>
        <span className="text-xs text-gray-500">{resultsEntered}/104 results in</span>
        {masterExtras?.third_place_override && (
          <span className="text-xs text-amber-400 ml-2" title="Admin has manually set 3rd place qualifiers">⚠ 3rd override</span>
        )}
      </nav>

      <div className="max-w-4xl mx-auto p-4 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🏅 Standings</h1>
          <p className="text-gray-500 text-sm mt-1">{league.league_name} · {members?.length} participants</p>
        </div>

        {resultsEntered === 0 && (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-400">Standings will appear once match results start coming in</p>
            <p className="text-gray-600 text-sm mt-1">The tournament kicks off June 11, 2026</p>
          </div>
        )}

        {/* Standings table */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-yellow-500/5">
                <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider hidden sm:table-cell">Predictions</th>
                <th className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Group</th>
                <th className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">KO</th>
                <th className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Extras</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const placeColor = s.place === 1 ? 'text-yellow-400' : s.place === 2 ? 'text-gray-300' : s.place === 3 ? 'text-amber-600' : 'text-gray-500'
                const isCurrentUser = s.isCurrentUser
                return (
                  <tr key={s.userId}
                    className={`border-b border-gray-800/50 transition-colors
                      ${isCurrentUser ? 'bg-yellow-500/5' : 'hover:bg-gray-800/30'}
                      ${s.place === 1 ? 'bg-yellow-500/5' : ''}`}>
                    <td className={`px-4 py-3 font-bold text-lg ${placeColor}`}>
                      {s.place === 1 ? '🥇' : s.place === 2 ? '🥈' : s.place === 3 ? '🥉' : s.place}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
                          {s.displayName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {s.displayName}
                            {isCurrentUser && <span className="ml-1 text-xs text-yellow-400">(you)</span>}
                            {s.isAdmin && <span className="ml-1 text-xs text-gray-500">⭐</span>}
                          </p>
                          {s.starPicks?.group && (
                            <p className="text-xs text-gray-500">⭐ {s.starPicks.group} <span className="text-gray-700">(group)</span></p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      <div className="text-xs text-gray-500">{s.filled}/104</div>
                      <div className="w-16 h-1 bg-gray-800 rounded-full mx-auto mt-1 overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(s.filled/104)*100}%` }}/>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xl font-bold text-yellow-400">{s.total}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-gray-400 hidden md:table-cell">{s.groupPts}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-400 hidden md:table-cell">{s.koPts}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-400 hidden md:table-cell">{s.extrasPts}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Scoring guide */}
        <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-500">
          <strong className="text-gray-400">Scoring:</strong> Group/R32: 10pts result + 5pts score · R16: 20+10 · QF: 30+15 · SF: 50+25 · Final: 80+40 · Star Pick = 2× · Extras: 50pts closest
        </div>
      </div>

      {/* Points progression chart */}
      <PointsChart data={cumulativeChart} players={standings.map(s => s.displayName)} />
    
    </main>
  )
}