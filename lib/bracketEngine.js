/**
 * bracketEngine.js
 * Pure bracket resolution logic — no React, no Supabase, no side effects.
 * Used by:
 *   - app/dashboard/league/[id]/predictions/PredictionsClient.js
 *   - app/dashboard/league/[id]/standings/page.js
 *   - app/api/og/bracket/route.js
 *
 * NOTE ON PREDICTION MAP FORMAT:
 * The client (PredictionsClient) stores predictions as:
 *   predMap[fixture_id] = { home, away }
 *
 * The server (standings page, OG routes) fetches from Supabase and stores as:
 *   predMap[fixture_id] = { predicted_home, predicted_away }
 *
 * Pass the normalise=true option to resolveUserSlot / buildUserKOResults
 * when calling from server context, or pre-normalise before calling.
 * The helper `normalisePred(pred)` handles this.
 */

import { GROUPS, GROUP_TEAMS, ANNEX_C } from '@/lib/worldcup'

// ─── Normalise pred row to { home, away } regardless of source ────────────────
export function normalisePred(pred) {
  if (!pred) return null
  if (pred.home != null || pred.away != null) return pred          // client format
  return { home: pred.predicted_home, away: pred.predicted_away }  // server format
}

// ─── Group table simulation ───────────────────────────────────────────────────

export function calcH2H(teamNames, groupLetter, predMap, fixtures) {
  const stats = {}
  for (const t of teamNames) stats[t] = { pts: 0, gd: 0, gf: 0 }
  for (const f of fixtures) {
    if (f.round !== 'group' || f.match_group !== groupLetter) continue
    if (!teamNames.includes(f.home_team) || !teamNames.includes(f.away_team)) continue
    const raw = predMap[f.id]
    const pred = normalisePred(raw)
    if (!pred || pred.home == null || pred.away == null) continue
    stats[f.home_team].gf += pred.home
    stats[f.home_team].gd += pred.home - pred.away
    stats[f.away_team].gf += pred.away
    stats[f.away_team].gd += pred.away - pred.home
    if (pred.home > pred.away)      stats[f.home_team].pts += 3
    else if (pred.away > pred.home) stats[f.away_team].pts += 3
    else { stats[f.home_team].pts++; stats[f.away_team].pts++ }
  }
  return stats
}

export function sortGroupFifa(rows, groupLetter, predMap, fixtures) {
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

export function calcGroupTables(predMap, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const raw = predMap[f.id]
    const pred = normalisePred(raw)
    if (!pred || pred.home == null || pred.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += pred.home; t1.ga += pred.away
    t2.gf += pred.away; t2.ga += pred.home
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga
    if (pred.home > pred.away)      { t1.pts += 3 }
    else if (pred.away > pred.home) { t2.pts += 3 }
    else { t1.pts += 1; t2.pts += 1 }
  }
  for (const g of GROUPS) {
    tables[g] = sortGroupFifa(tables[g], g, predMap, fixtures)
  }
  return tables
}

export function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─── Annex C resolution ───────────────────────────────────────────────────────

const ANNEX_C_MATCH_TO_COL = { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

export function buildAnnexMap(tables) {
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

// ─── Slot resolver ────────────────────────────────────────────────────────────
// Works with both client format { home, away } and server format { predicted_home, predicted_away }
// via normalisePred above.

export function resolveSlot(slotCode, matchNum, tables, annexMap, predMap, fixturesByMatchNum, depth = 0) {
  if (!slotCode || depth > 10) return null

  if (/^[12][A-L]$/.test(slotCode)) {
    const pos = slotCode[0] === '1' ? 0 : 1
    return tables[slotCode[1]]?.[pos]?.team ?? null
  }

  if (/^3[A-L]{2,}$/.test(slotCode)) {
    return annexMap[matchNum] ?? null
  }

  if (slotCode.startsWith('W')) {
    const mn = parseInt(slotCode.slice(1))
    const f = fixturesByMatchNum[mn]
    if (!f) return null
    const pred = normalisePred(predMap[f.id])
    if (!pred || pred.home == null || pred.away == null) return null
    const t1 = resolveSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    const t2 = resolveSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    if (pred.home > pred.away) return t1
    if (pred.away > pred.home) return t2
    return null
  }

  if (slotCode.startsWith('L')) {
    const mn = parseInt(slotCode.slice(1))
    const f = fixturesByMatchNum[mn]
    if (!f) return null
    const pred = normalisePred(predMap[f.id])
    if (!pred || pred.home == null || pred.away == null) return null
    const t1 = resolveSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    const t2 = resolveSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum, depth + 1)
    if (pred.home > pred.away) return t2
    if (pred.away > pred.home) return t1
    return null
  }

  return null
}

// ─── Build full bracket context (used by PredictionsClient) ──────────────────

export function buildBracketContext(predMap, fixtures, tables) {
  const allThirds = calcAllThirds(tables)
  const top8 = allThirds.slice(0, 8)
  const top8groups = top8.map(t => t.group)
  const annexMap = buildAnnexMap(tables)
  return { annexMap, allThirds, top8groups }
}

// ─── Check if group is fully predicted ───────────────────────────────────────

export function isGroupComplete(groupLetter, predMap, fixtures) {
  const groupFs = fixtures.filter(f => f.round === 'group' && f.match_group === groupLetter)
  return groupFs.length === 6 && groupFs.every(f => {
    const pred = normalisePred(predMap[f.id])
    return pred?.home != null && pred?.away != null
  })
}

// ─── Build user KO results map ────────────────────────────────────────────────
// Returns: { [round]: { [teamName]: { gf, ga, won } } }

export function buildUserKOResults(predMap, fixtures, tables, annexMap, fixturesByMatchNum) {
  const results = {}
  const koFixtures = fixtures.filter(f => f.round !== 'group')
    .sort((a, b) => a.match_number - b.match_number)

  for (const f of koFixtures) {
    const pred = normalisePred(predMap[f.id])
    if (!pred || pred.home == null || pred.away == null) continue

    const userHome = resolveSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
    const userAway = resolveSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
    if (!userHome || !userAway) continue

    if (!results[f.round]) results[f.round] = {}

    results[f.round][userHome] = {
      gf: pred.home,
      ga: pred.away,
      won: pred.home > pred.away,
    }
    results[f.round][userAway] = {
      gf: pred.away,
      ga: pred.home,
      won: pred.away > pred.home,
    }
  }

  return results
}

// ─── Resolve predicted bracket for OG image ──────────────────────────────────
// Returns the teams the user predicted to reach R16, QF, SF, Final
// structured as { left: [...], right: [...] } per round, plus champion.
// "Left" = matches 65-72 (top half), "Right" = matches 73-80 (bottom half).
// R16 fixtures are 65-80; we split 65-72 left, 73-80 right.

export function resolvePredictedBracket(predMap, fixtures) {
  const fixturesByMatchNum = {}
  for (const f of fixtures) if (f.match_number) fixturesByMatchNum[f.match_number] = f

  const tables = calcGroupTables(predMap, fixtures)
  const annexMap = buildAnnexMap(tables)

  const koFixtures = fixtures.filter(f => f.round !== 'group')
  const roundOrder = ['R16', 'QF', 'SF', 'FINAL']

  // For each KO fixture, resolve both slots and the winner
  const bracketData = {}
  for (const round of roundOrder) {
    const rFixtures = koFixtures
      .filter(f => f.round === round)
      .sort((a, b) => a.match_number - b.match_number)

    bracketData[round] = rFixtures.map(f => {
      const pred = normalisePred(predMap[f.id])
      const t1 = resolveSlot(f.slot1, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
      const t2 = resolveSlot(f.slot2, f.match_number, tables, annexMap, predMap, fixturesByMatchNum)
      let winner = null
      if (pred && pred.home != null && pred.away != null) {
        if (pred.home > pred.away) winner = t1
        else if (pred.away > pred.home) winner = t2
      }
      return { matchNumber: f.match_number, t1, t2, winner }
    })
  }

  // Split R16 into left (first 8) and right (last 8)
  const r16 = bracketData['R16'] || []
  const mid = Math.ceil(r16.length / 2)

  return {
    leftR16:   r16.slice(0, mid),
    rightR16:  r16.slice(mid),
    leftQF:    (bracketData['QF']  || []).slice(0, 2),
    rightQF:   (bracketData['QF']  || []).slice(2),
    leftSF:    (bracketData['SF']  || []).slice(0, 1),
    rightSF:   (bracketData['SF']  || []).slice(1),
    final:     (bracketData['FINAL'] || [])[0] ?? null,
    champion:  (bracketData['FINAL'] || [])[0]?.winner ?? null,
  }
}