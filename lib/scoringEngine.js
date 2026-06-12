/**
 * lib/scoringEngine.js
 * Scoring functions extracted from standings/page.js.
 * Imports bracket resolution from bracketEngine.js.
 * Used by:
 *   - app/dashboard/league/[id]/standings/page.js
 *   - app/dashboard/league/[id]/standings/generateMetadata (same file)
 */

import {
  calcGroupTables,
  buildAnnexMap,
  buildUserKOResults,
} from '@/lib/bracketEngine'

// ─── Scoring constants ────────────────────────────────────────────────────────

export const KO_POINTS = {
  R32:   [10,  5],
  R16:   [20, 10],
  QF:    [30, 15],
  SF:    [30, 15],
  '3RD': [50, 25],
  FINAL: [50, 25],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getResult(s1, s2) {
  if (s1 > s2) return 'H'
  if (s2 > s1) return 'A'
  return 'D'
}

// ─── Score a single KO fixture for one user ───────────────────────────────────
// realHome/realAway are actual team names; actualHome/actualAway are pen-adjusted scores.

export function scoreKOFixture(f, actualHome, actualAway, userKOResults, starPick) {
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

// ─── Score a full participant ─────────────────────────────────────────────────

export function scoreParticipant(predictions, fixtures, extrasPred, masterExtras) {
  let groupPts = 0
  let koPts = 0
  let extrasPts = 0

  const predMap = {}
  for (const p of predictions) predMap[p.fixture_id] = p

  const fixturesByMatchNum = {}
  for (const f of fixtures) if (f.match_number) fixturesByMatchNum[f.match_number] = f

  const starPicks = {
    group: extrasPred?.star_pick_group ?? null,
    R32:   extrasPred?.star_pick_r32   ?? null,
    R16:   extrasPred?.star_pick_r16   ?? null,
    QF:    extrasPred?.star_pick_qf    ?? null,
    SF:    extrasPred?.star_pick_sf    ?? null,
    FINAL: extrasPred?.star_pick_final ?? null,
  }

  // ── Group stage ─────────────────────────────────────────────────────────────
  for (const f of fixtures.filter(f => f.round === 'group')) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predMap[f.id]
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    const masterResult = getResult(f.home_score, f.away_score)
    const predResult   = getResult(pred.predicted_home, pred.predicted_away)
    if (masterResult !== predResult) continue

    let pts = 10
    if (pred.predicted_home === f.home_score && pred.predicted_away === f.away_score) pts += 5
    if (starPicks.group && (f.home_team === starPicks.group || f.away_team === starPicks.group)) pts *= 2
    groupPts += pts
  }

  // ── KO stage ────────────────────────────────────────────────────────────────
  const groupPredMap = {}
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const pred = predMap[f.id]
    if (pred) groupPredMap[f.id] = pred
  }

  const tables       = calcGroupTables(groupPredMap, fixtures)
  const annexMap     = buildAnnexMap(tables)
  const userKOResults = buildUserKOResults(predMap, fixtures, tables, annexMap, fixturesByMatchNum)

  for (const f of fixtures.filter(f => f.round !== 'group')) {
    if (f.home_score == null || f.away_score == null) continue

    let actualHome = f.home_score
    let actualAway = f.away_score
    if (f.penalty_winner && f.home_score === f.away_score) {
      if (f.penalty_winner === f.home_team) actualHome += 1
      else actualAway += 1
    }

    const starRound = f.round === '3RD' ? 'FINAL' : f.round
    koPts += scoreKOFixture(f, actualHome, actualAway, userKOResults, starPicks[starRound] ?? null)
  }
  
  // ── Extras ──────────────────────────────────────────────────────────────────
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

// ─── Build chart KO results for all players ───────────────────────────────────
// Pre-builds userKOResults per player for the points progression chart.

export function buildAllPlayerKOResults(standings, allPredictions, fixtures) {
  const playerKOResults = {}
  for (const s of standings) {
    const userPreds = allPredictions?.filter(p => p.user_id === s.userId) || []
    const predMap = {}
    for (const p of userPreds) predMap[p.fixture_id] = p

    const fixturesByMatchNum = {}
    for (const f of fixtures) if (f.match_number) fixturesByMatchNum[f.match_number] = f

    const groupPredMap = {}
    for (const f of fixtures.filter(f => f.round === 'group')) {
      const pred = predMap[f.id]
      if (pred) groupPredMap[f.id] = pred
    }

    const tables   = calcGroupTables(groupPredMap, fixtures)
    const annexMap = buildAnnexMap(tables)
    playerKOResults[s.userId] = buildUserKOResults(predMap, fixtures, tables, annexMap, fixturesByMatchNum)
  }
  return playerKOResults
}