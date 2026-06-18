// lib/miniScoringEngine.js
import { KO_ROUNDS, MINI_SEMI_BONUS, MINI_KO_POINTS } from '@/lib/worldcup'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive the actual semi-finalists from SF fixtures.
 * Returns a Set of confirmed team name strings.
 */
function getActualSemiFinalists(fixtures) {
  const teams = new Set()
  for (const f of fixtures) {
    if (f.round === 'SF') {
      if (f.home_team) teams.add(f.home_team)
      if (f.away_team) teams.add(f.away_team)
    }
  }
  return teams
}

/**
 * Derive the actual winner of a completed KO fixture.
 * Uses penalty_winner if set, otherwise compares scores.
 * Returns team name string or null if not yet complete.
 */
function getFixtureWinner(fixture) {
  if (fixture.home_score == null || fixture.away_score == null) return null
  if (fixture.penalty_winner) return fixture.penalty_winner
  if (fixture.home_score > fixture.away_score) return fixture.home_team
  if (fixture.away_score > fixture.home_score) return fixture.away_team
  return null // draw with no penalty winner — shouldn't occur in KO but guard defensively
}

// ── Main scoring function ─────────────────────────────────────────────────────

/**
 * Score a single participant in a mini-game league.
 *
 * @param {Array} semiPicks - rows from mini_semi_picks: [{ team }]
 * @param {Array} koPreds   - rows from mini_ko_predictions: [{ fixture_id, predicted_winner }]
 * @param {Array} fixtures  - all KO fixtures from the fixtures table
 * @returns {{ semiBonus, koPoints, total, correctSemiPicks, breakdown }}
 */
export function scoreMiniParticipant(semiPicks, koPreds, fixtures) {
  const koRoundSet = new Set(KO_ROUNDS)

  // ── Semi-finalist bonus ──────────────────────────────────────────────────
  const actualSemis  = getActualSemiFinalists(fixtures)
  const pickedTeams  = (semiPicks || []).map(p => p.team)

  // Only count correct picks once we have at least one confirmed semi-finalist
  const correctSemiPicks = actualSemis.size > 0
    ? pickedTeams.filter(t => actualSemis.has(t)).length
    : 0

  const semiBonus = MINI_SEMI_BONUS[correctSemiPicks] ?? 0

  // ── KO predictions ───────────────────────────────────────────────────────
  const predMap = Object.fromEntries(
    (koPreds || []).map(p => [p.fixture_id, p.predicted_winner])
  )

  let koPoints = 0
  const breakdown = {} // fixture_id → { predicted, actual, correct, points, round }

  for (const fixture of fixtures) {
    if (!koRoundSet.has(fixture.round)) continue

    const predicted = predMap[fixture.id]
    if (!predicted) continue

    const actual = getFixtureWinner(fixture)
    if (!actual) continue // not yet complete

    const pts = predicted === actual ? (MINI_KO_POINTS[fixture.round] ?? 0) : 0
    koPoints += pts

    breakdown[fixture.id] = {
      predicted,
      actual,
      correct: predicted === actual,
      points:  pts,
      round:   fixture.round,
    }
  }

  return {
    semiBonus,
    koPoints,
    total: semiBonus + koPoints,
    correctSemiPicks,
    breakdown,
  }
}

// ── Batch scoring for standings ───────────────────────────────────────────────

/**
 * Score all members of a mini-game league for standings.
 *
 * @param {Array} members      - mini_league_members rows with profiles joined
 * @param {Array} allSemiPicks - all mini_semi_picks rows for this league
 * @param {Array} allKoPreds   - all mini_ko_predictions rows for this league
 * @param {Array} fixtures     - all KO fixtures
 * @returns {Array} sorted by total desc: [{ userId, name, semiBonus, koPoints, total, correctSemiPicks }]
 */
export function scoreMiniLeague(members, allSemiPicks, allKoPreds, fixtures) {
  return members
    .map(m => {
      const userSemiPicks = (allSemiPicks || []).filter(p => p.user_id === m.user_id)
      const userKoPreds   = (allKoPreds   || []).filter(p => p.user_id === m.user_id)
      const { semiBonus, koPoints, total, correctSemiPicks } =
        scoreMiniParticipant(userSemiPicks, userKoPreds, fixtures)

      return {
        userId:            m.user_id,
        name:              m.nickname || m.profiles?.display_name || '?',
        semiBonus,
        koPoints,
        total,
        correctSemiPicks,
      }
    })
    .sort((a, b) => b.total - a.total)
}