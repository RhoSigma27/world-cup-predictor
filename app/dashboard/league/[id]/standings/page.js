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

// ─── Group table simulation with full FIFA H2H tiebreakers ───────────────────

function calcH2H(teamNames, groupLetter, predMap, fixtures) {
  const stats = {}
  for (const t of teamNames) stats[t] = { pts: 0, gd: 0, gf: 0 }
  for (const f of fixtures) {
    if (f.round !== 'group' || f.match_group !== groupLetter) continue
    if (!teamNames.includes(f.home_team) || !teamNames.includes(f.away_team)) continue
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue
    stats[f.home_team].gf += pred.predicted_home
    stats[f.home_team].gd += pred.predicted_home - pred.predicted_away
    stats[f.away_team].gf += pred.predicted_away
    stats[f.away_team].gd += pred.predicted_away - pred.predicted_home
    if (pred.predicted_home > pred.predicted_away) stats[f.home_team].pts += 3
    else if (pred.predicted_away > pred.predicted_home) stats[f.away_team].pts += 3
    else { stats[f.home_team].pts++; stats[f.away_team].pts++ }
  }
  return stats
}

function sortGroupFifa(rows, groupLetter, predMap, fixtures) {
  rows.sort((a, b) => b.pts - a.pts)
  const sorted = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && rows[j].pts === rows[i].pts) j++
    const tied = rows.slice(i, j)
    if (tied.length === 1) { sorted.push(...tied); i = j; continue }
    const h2h = calcH2H(tied.map(r => r.team), groupLetter, predMap, fixtures)
    tied.sort((a, b) => {
      const ha = h2h[a.team], hb = h2h[b.team]
      if (hb.pts !== ha.pts) return hb.pts - ha.pts
      if (hb.gd  !== ha.gd)  return hb.gd  - ha.gd
      if (hb.gf  !== ha.gf)  return hb.gf  - ha.gf
      if (b.gd   !== a.gd)   return b.gd   - a.gd
      return b.gf - a.gf
    })
    sorted.push(...tied)
    i = j
  }
  return sorted
}

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
    tables[g] = sortGroupFifa(tables[g], g, predMap, fixtures)
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

function resolveUserSlot(slotCode, matchNum, tables, annexMap, predMap, fixturesByMatchNum, depth = 0) {
  if (!slotCode || depth > 10) return null

  if (/^[12][A-L]$/.test(slotCode)) {
    const pos = slotCode[0] === '1' ? 0 : 1
    return tables[slotCode[1]]?.[pos]?.team ?? null
  }

  if (/^3[A-L]{2,}$/.test(slotCode)) {
    return annexMap[matchNum] ?? null
  }

  if (slotCode.startsWith('W')) {
    const matchNum2 = parseInt(slotCode.slice(1))
    const f = fixturesByMatchNum[matchNum2]
    if (!f) return null
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) return null
    const t1 = resolveUserSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    const t2 = resolveUserSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    if (pred.predicted_home > pred.predicted_away) return t1
    if (pred.predicted_away > pred.predicted_home) return t2
    return null
  }

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

// ─── Build user KO results map ────────────────────────────────────────────────
// Simulates the user's full bracket once and produces a flat lookup:
// userKOResults[round][teamName] = { gf, ga, won }
// This is the single source of truth for KO scoring and chart data.

function buildUserKOResults(predMap, fixtures, tables, annexMap, fixturesByMatchNum) {
  const results = {}
  const koFixtures = fixtures.filter(f => f.round !== 'group')
    .sort((a, b) => a.match_number - b.match_number)

  for (const f of koFixtures) {
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    const userHome = resolveUserSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
    const userAway = resolveUserSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
    if (!userHome || !userAway) continue

    if (!results[f.round]) results[f.round] = {}

    // Store from each team's perspective: gf = goals scored, ga = goals conceded
    results[f.round][userHome] = {
      gf: pred.predicted_home,
      ga: pred.predicted_away,
      won: pred.predicted_home > pred.predicted_away,
    }
    results[f.round][userAway] = {
      gf: pred.predicted_away,
      ga: pred.predicted_home,
      won: pred.predicted_away > pred.predicted_home,
    }
  }

  return results
}

// ─── Scoring constants ────────────────────────────────────────────────────────

const KO_POINTS = {
  R32:   [10,  5],
  R16:   [20, 10],
  QF:    [30, 15],
  SF:    [30, 15],
  '3RD': [50, 25],
  FINAL: [50, 25],
}

// ─── Score a single KO fixture for a user ────────────────────────────────────
// Returns points earned for this fixture (0–2 teams can score).
// realHome/realAway are the actual teams; actualHome/actualAway are pen-adjusted scores.

function scoreKOFixture(f, actualHome, actualAway, userKOResults, starPick) {
  const [base, bonus] = KO_POINTS[f.round] || [0, 0]
  let pts = 0

  for (const [realTeam, realGF, realGA, realWon] of [
    [f.home_team, actualHome, actualAway, actualHome > actualAway],
    [f.away_team, actualAway, actualHome, actualAway > actualHome],
  ]) {
    const userResult = userKOResults[f.round]?.[realTeam]
    if (!userResult) continue
    if (userResult.won !== realWon) continue

    let teamPts = base
    if (userResult.gf === realGF && userResult.ga === realGA) teamPts += bonus
    if (starPick && starPick === realTeam) teamPts *= 2
    pts += teamPts
  }

  return pts
}

// ─── Main scoring function ────────────────────────────────────────────────────

function scoreParticipant(predictions, fixtures, extrasPred, masterExtras) {
  let groupPts = 0
  let koPts = 0
  let extrasPts = 0

  // Build prediction map: fixture_id → prediction row
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

  // ── Group stage scoring (fixture-based) ──────────────────────────────────
  for (const f of fixtures.filter(f => f.round === 'group')) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    const masterResult = getResult(f.home_score, f.away_score)
    const predResult = getResult(pred.predicted_home, pred.predicted_away)
    if (masterResult !== predResult) continue

    let pts = 10
    if (pred.predicted_home === f.home_score && pred.predicted_away === f.away_score) pts += 5
    if (starPicks.group && (f.home_team === starPicks.group || f.away_team === starPicks.group)) pts *= 2
    groupPts += pts
  }

  // ── KO stage scoring (team-centric via userKOResults map) ────────────────

  // Simulate user's bracket once to build the team result map
  const groupPredMap = {}
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const pred = predMap[f.id]
    if (pred) groupPredMap[f.id] = pred
  }
  const tables = calcGroupTables(groupPredMap, fixtures)
  const annexMap = buildAnnexMap(tables)
  const userKOResults = buildUserKOResults(predMap, fixtures, tables, annexMap, fixturesByMatchNum)

  for (const f of fixtures.filter(f => f.round !== 'group')) {
    if (f.home_score == null || f.away_score == null) continue

    // Penalty adjustment for actual result
    let actualHome = f.home_score
    let actualAway = f.away_score
    if (f.penalty_winner && f.home_score === f.away_score) {
      if (f.penalty_winner === f.home_team) actualHome += 1
      else actualAway += 1
    }

    const starRound = f.round === '3RD' ? 'FINAL' : f.round
    const starPick = starPicks[starRound] ?? null

    koPts += scoreKOFixture(f, actualHome, actualAway, userKOResults, starPick)
  }

  // ── Extras scoring ────────────────────────────────────────────────────────
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

  // Get all fixtures
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  // Get all league members with profiles (excluding banned users)
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

  // Get global master extras
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

  // Sort by total points, break ties by group points
  standings.sort((a, b) => b.total - a.total || b.groupPts - a.groupPts)

  // Assign places (handle ties)
  let place = 1
  standings.forEach((s, i) => {
    if (i > 0 && s.total !== standings[i - 1].total) place = i + 1
    s.place = place
  })

  const resultsEntered = fixtures?.filter(f => f.home_score != null && f.away_score != null).length || 0

  // ── Chart data ────────────────────────────────────────────────────────────
  // Build cumulative points progression per player per completed match.
  // Group fixtures use fixture-based scoring; KO fixtures use team-centric scoring
  // via each player's userKOResults map — consistent with the standings engine.

  const completedFixtures = (fixtures || [])
    .filter(f => f.home_score != null && f.away_score != null)
    .sort((a, b) => a.match_number - b.match_number)

  // Pre-build userKOResults for each player (needed for chart KO scoring)
  const playerKOResults = {}
  for (const s of standings) {
    const userPreds = allPredictions?.filter(p => p.user_id === s.userId) || []
    const predMap = {}
    for (const p of userPreds) predMap[p.fixture_id] = p
    const fixturesByMatchNum = {}
    for (const f of fixtures || []) if (f.match_number) fixturesByMatchNum[f.match_number] = f
    const groupPredMap = {}
    for (const f of (fixtures || []).filter(f => f.round === 'group')) {
      const pred = predMap[f.id]
      if (pred) groupPredMap[f.id] = pred
    }
    const tables = calcGroupTables(groupPredMap, fixtures || [])
    const annexMap = buildAnnexMap(tables)
    playerKOResults[s.userId] = buildUserKOResults(predMap, fixtures || [], tables, annexMap, fixturesByMatchNum)
  }

  const chartData = completedFixtures.map((f, idx) => {
    const point = { match: f.match_number }

    standings.forEach(s => {
      const pred = allPredictions?.find(p => p.user_id === s.userId && p.fixture_id === f.id)

      if (f.round === 'group') {
        // Group stage: fixture-based scoring
        if (!pred || pred.predicted_home == null || pred.predicted_away == null) {
          point[s.displayName] = 0
          return
        }
        const masterResult = getResult(f.home_score, f.away_score)
        const predResult = getResult(pred.predicted_home, pred.predicted_away)
        if (masterResult !== predResult) { point[s.displayName] = 0; return }

        let pts = 10
        if (pred.predicted_home === f.home_score && pred.predicted_away === f.away_score) pts += 5
        const chartStarPick = s.starPicks?.group ?? null
        if (chartStarPick && (f.home_team === chartStarPick || f.away_team === chartStarPick)) pts *= 2
        point[s.displayName] = pts

      } else {
        // KO stage: team-centric scoring via userKOResults
        let actualHome = f.home_score
        let actualAway = f.away_score
        if (f.penalty_winner && f.home_score === f.away_score) {
          if (f.penalty_winner === f.home_team) actualHome += 1
          else actualAway += 1
        }

        const starRound = f.round === '3RD' ? 'FINAL' : f.round
        const starPick = s.starPicks?.[starRound] ?? null
        const userKOResults = playerKOResults[s.userId] || {}

        point[s.displayName] = scoreKOFixture(f, actualHome, actualAway, userKOResults, starPick)
      }
    })

    return point
  })

  // Convert to cumulative
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