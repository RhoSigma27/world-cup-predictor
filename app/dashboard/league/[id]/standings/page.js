// ─── standings/page.js ───────────────────────────────────────────────────────
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PointsChart from './PointsChart'
import LeagueLogo from '@/app/components/LeagueLogo'
import {
  GROUPS, GROUP_TEAMS, ANNEX_C,
} from '@/lib/worldcup'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getResult(s1, s2) {
  if (s1 > s2) return 'H'
  if (s2 > s1) return 'A'
  return 'D'
}

// ─── Group table simulation (mirrors PredictionsClient.js) ───────────────────

function calcGroupTables(predMap, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += pred.predicted_home; t1.ga += pred.predicted_away
    t2.gf += pred.predicted_away; t2.ga += pred.predicted_home
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga
    if (pred.predicted_home > pred.predicted_away) { t1.pts += 3 }
    else if (pred.predicted_away > pred.predicted_home) { t2.pts += 3 }
    else { t1.pts += 1; t2.pts += 1 }
  }
  for (const g of GROUPS) {
    tables[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  }
  return tables
}

function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─── Annex C resolution ───────────────────────────────────────────────────────

const ANNEX_C_MATCH_TO_COL = { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

function buildAnnexMap(tables) {
  const top8 = calcAllThirds(tables).slice(0, 8).map(t => t.group)
  const key = [...top8].sort().join('')
  const entry = ANNEX_C[key]
  if (!entry) return {}
  const result = {}
  for (const [matchNum, col] of Object.entries(ANNEX_C_MATCH_TO_COL)) {
    const groupLetter = entry[col]
    result[Number(matchNum)] = tables[groupLetter]?.[2]?.team ?? null
  }
  return result
}

// ─── Bracket slot resolver ────────────────────────────────────────────────────
// Returns the team a USER predicted would occupy a given slot,
// based on their group predictions and KO predictions.

function resolveUserSlot(slotCode, matchNum, tables, annexMap, predMap, fixturesByMatchNum, depth = 0) {
  if (!slotCode || depth > 10) return null

  // Group winner/runner-up
  if (/^[12][A-L]$/.test(slotCode)) {
    const pos = slotCode[0] === '1' ? 0 : 1
    return tables[slotCode[1]]?.[pos]?.team ?? null
  }

  // 3rd place slot — resolved via Annex C
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    return annexMap[matchNum] ?? null
  }

  // Winner of match N
  if (slotCode.startsWith('W')) {
    const matchNum2 = parseInt(slotCode.slice(1))
    const f = fixturesByMatchNum[matchNum2]
    if (!f) return null
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) return null
    const t1 = resolveUserSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    const t2 = resolveUserSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    // Apply pen adjustment: if draw, no winner resolvable
    const effHome = pred.predicted_home
    const effAway = pred.predicted_away
    if (effHome > effAway) return t1
    if (effAway > effHome) return t2
    return null // draw — can't resolve winner
  }

  // Loser of match N (for 3rd place)
  if (slotCode.startsWith('L')) {
    const matchNum2 = parseInt(slotCode.slice(1))
    const f = fixturesByMatchNum[matchNum2]
    if (!f) return null
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) return null
    const t1 = resolveUserSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    const t2 = resolveUserSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    if (pred.predicted_home > pred.predicted_away) return t2
    if (pred.predicted_away > pred.predicted_home) return t1
    return null
  }

  return null
}

// ─── Main scoring function ────────────────────────────────────────────────────

const KO_POINTS = {
  R32:   [10,  5],
  R16:   [20, 10],
  QF:    [30, 15],
  SF:    [30, 15],
  '3RD': [50, 25],
  FINAL: [50, 25],
}

function scoreParticipant(predictions, fixtures, extrasPred, masterExtras) {
  let groupPts = 0
  let koPts = 0
  let extrasPts = 0

  // Build prediction map: fixture_id → {predicted_home, predicted_away}
  const predMap = {}
  for (const p of predictions) {
    predMap[p.fixture_id] = p
  }

  // Build fixture index by match_number
  const fixturesByMatchNum = {}
  for (const f of fixtures) {
    if (f.match_number) fixturesByMatchNum[f.match_number] = f
  }

  // Star picks per round
  const starPicks = {
    group: extrasPred?.star_pick_group ?? null,
    R32:   extrasPred?.star_pick_r32   ?? null,
    R16:   extrasPred?.star_pick_r16   ?? null,
    QF:    extrasPred?.star_pick_qf    ?? null,
    SF:    extrasPred?.star_pick_sf    ?? null,
    FINAL: extrasPred?.star_pick_final ?? null,
  }

  // ── Group stage scoring (fixture-based, unchanged) ────────────────────────
  for (const f of fixtures.filter(f => f.round === 'group')) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    const masterResult = getResult(f.home_score, f.away_score)
    const predResult = getResult(pred.predicted_home, pred.predicted_away)
    if (masterResult !== predResult) continue

    let pts = 10
    if (pred.predicted_home === f.home_score && pred.predicted_away === f.away_score) pts += 5

    // Star pick doubles
    if (starPicks.group && (f.home_team === starPicks.group || f.away_team === starPicks.group)) {
      pts *= 2
    }
    groupPts += pts
  }

  // ── KO stage scoring (team-centric) ──────────────────────────────────────

  // Simulate this user's bracket from their group predictions
  const groupPredMap = {}
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const pred = predMap[f.id]
    if (pred) groupPredMap[f.id] = pred
  }
  const tables = calcGroupTables(groupPredMap, fixtures)
  const annexMap = buildAnnexMap(tables)

  for (const f of fixtures.filter(f => f.round !== 'group')) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    const [base, bonus] = KO_POINTS[f.round] || [0, 0]
    const starRound = f.round === '3RD' ? 'FINAL' : f.round
    const starPick = starPicks[starRound] ?? null

    // Penalty adjustment for actual result
    let actualHome = f.home_score
    let actualAway = f.away_score
    if (f.penalty_winner && f.home_score === f.away_score) {
      if (f.penalty_winner === f.home_team) actualHome += 1
      else actualAway += 1
    }
    const actualHomeWins = actualHome > actualAway  // always true in KO (no draws)
    const actualAwayWins = actualAway > actualHome

    // Penalty adjustment for user prediction
    // User signals pen winner by giving +1 to one side in a drawn score
    // We use their raw predicted scores directly
    const predHomeWins = pred.predicted_home > pred.predicted_away
    const predAwayWins = pred.predicted_away > pred.predicted_home

    // Resolve which teams the USER predicted in each slot
    const userHome = resolveUserSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
    const userAway = resolveUserSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)

    // Score home slot team
    if (userHome && userHome === f.home_team) {
      // User had the correct team in this slot
      if (actualHomeWins === predHomeWins && actualAwayWins === predAwayWins) {
        // Correct result for this team
        let pts = base
        // Exact score bonus — using pen-adjusted actual vs raw predicted
        if (pred.predicted_home === actualHome && pred.predicted_away === actualAway) {
          pts += bonus
        }
        if (starPick && starPick === userHome) pts *= 2
        koPts += pts
      }
    }

    // Score away slot team
    if (userAway && userAway === f.away_team) {
      // User had the correct team in this slot
      if (actualHomeWins === predHomeWins && actualAwayWins === predAwayWins) {
        // Correct result for this team
        let pts = base
        // Exact score bonus
        if (pred.predicted_home === actualHome && pred.predicted_away === actualAway) {
          pts += bonus
        }
        if (starPick && starPick === userAway) pts *= 2
        koPts += pts
      }
    }
  }

  // ── Extras scoring (unchanged) ────────────────────────────────────────────
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

  return { total: groupPts + koPts + extrasPts, groupPts, koPts, extrasPts }
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

  // Get all league members with profiles (excluding banned users)
  // ── CHANGED: added nickname to select ────────────────────────────────────
  const { data: members } = await adminSupabase
    .from('league_members')
    .select(`
      user_id,
      joined_at,
      nickname,
      profiles (
        display_name,
        is_banned
      )
    `)
    .eq('league_id', id)

  // Get global master extras (single global row)
  const { data: masterExtras } = await supabase
    .from('master_extras')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()

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

  // Calculate scores for each member (excluding banned users)
  const standings = members?.filter(m => !m.profiles?.is_banned).map(member => {
    const userPreds = allPredictions?.filter(p => p.user_id === member.user_id) || []
    const userExtras = allExtras?.find(e => e.user_id === member.user_id) || null

    const score = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
    const filled = userPreds.filter(p => p.predicted_home != null && p.predicted_away != null).length

    return {
      userId: member.user_id,
      // ── CHANGED: nickname takes precedence over display_name ──────────────
      displayName: member.nickname || member.profiles?.display_name,
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
  const completedFixtures = (fixtures || [])
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
        QF: [30, 15], SF: [30, 15], '3RD': [50, 25], FINAL: [50, 25],
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

  // Convert to cumulative — use a mutable array to avoid temporal dead zone
  const cumulativeChart = []
  for (const point of chartData) {
    const cumPoint = { match: point.match }
    const prev = cumulativeChart[cumulativeChart.length - 1]
    standings.forEach(s => {
      cumPoint[s.displayName] = (prev?.[s.displayName] || 0) + (point[s.displayName] || 0)
    })
    cumulativeChart.push(cumPoint)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/league/${id}`} className="text-gray-400 hover:text-white text-sm">
            ← {league.league_name}
          </Link>
          <LeagueLogo name={league.league_name} logoUrl={league.logo_url} size="sm" />
        </div>
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
                <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">Points</th>
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
                        <p className="font-medium text-sm">
                          {s.displayName}
                          {isCurrentUser && <span className="ml-1 text-xs text-yellow-400">(you)</span>}
                          {s.isAdmin && <span className="ml-1 text-xs text-gray-500">⭐</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xl font-bold text-yellow-400">{s.total}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Scoring guide */}
        <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-500">
          <strong className="text-gray-400">Scoring:</strong> Groups: 10pts result + 5pts score · R32: 10+5 per team · R16: 20+10 · QF/SF: 30+15 · 3rd/Final: 50+25 · Star Pick = 2× · Extras: 50pts closest
        </div>
      </div>

      {/* Points progression chart */}
      <PointsChart data={cumulativeChart} players={standings.map(s => s.displayName)} />
    
    </main>
  )
}