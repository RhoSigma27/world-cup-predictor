'use client'

import {
  GROUPS, GROUP_TEAMS, COUNTRY_CODES, ANNEX_C,
  ROUND_LABELS, shortName, flagUrl,
} from '@/lib/worldcup'
import { useState, useRef, useCallback, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LOCK_DATE = new Date('2026-06-11T19:00:00Z')
const isLocked = () => new Date() >= LOCK_DATE

// ─────────────────────────────────────────────────────────────────────────────
//  GROUP TABLE CALCULATION — FIFA 2026 Article 20 tiebreaker order:
//  1. Points  2. H2H pts  3. H2H GD  4. H2H GF  5. Overall GD  6. Overall GF
// ─────────────────────────────────────────────────────────────────────────────

function calcGroupTables(predictions, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  const groupFixtures = fixtures.filter(f => f.round === 'group')
  for (const f of groupFixtures) {
    const pred = predictions[f.id]
    if (!pred || pred.home == null || pred.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += pred.home; t1.ga += pred.away
    t2.gf += pred.away; t2.ga += pred.home
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga
    if (pred.home > pred.away)      { t1.won++; t1.pts += 3; t2.lost++ }
    else if (pred.away > pred.home) { t2.won++; t2.pts += 3; t1.lost++ }
    else                            { t1.drawn++; t1.pts++; t2.drawn++; t2.pts++ }
  }
  for (const g of GROUPS) {
    tables[g] = sortGroupFifa(tables[g], g, predictions, fixtures)
  }
  return tables
}

function calcH2H(teamNames, groupLetter, predictions, fixtures) {
  const stats = {}
  for (const t of teamNames) stats[t] = { pts: 0, gd: 0, gf: 0 }
  for (const f of fixtures) {
    if (f.round !== 'group' || f.match_group !== groupLetter) continue
    if (!teamNames.includes(f.home_team) || !teamNames.includes(f.away_team)) continue
    const pred = predictions[f.id]
    if (!pred || pred.home == null || pred.away == null) continue
    stats[f.home_team].gf += pred.home
    stats[f.home_team].gd += pred.home - pred.away
    stats[f.away_team].gf += pred.away
    stats[f.away_team].gd += pred.away - pred.home
    if (pred.home > pred.away)      stats[f.home_team].pts += 3
    else if (pred.away > pred.home) stats[f.away_team].pts += 3
    else                            { stats[f.home_team].pts++; stats[f.away_team].pts++ }
  }
  return stats
}

function sortGroupFifa(rows, groupLetter, predictions, fixtures) {
  rows.sort((a, b) => b.pts - a.pts)
  const sorted = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && rows[j].pts === rows[i].pts) j++
    const tied = rows.slice(i, j)
    if (tied.length === 1) { sorted.push(...tied); i = j; continue }
    const h2h = calcH2H(tied.map(r => r.team), groupLetter, predictions, fixtures)
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

// 3rd place ranking — no H2H (different groups), stop at GF
function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─── CHANGE 1: isGroupComplete helper ────────────────────────────────────────
// Returns true only when all 6 group matches for a group are fully predicted
function isGroupComplete(groupLetter, groupPredictions, fixtures) {
  const groupFs = fixtures.filter(f => f.round === 'group' && f.match_group === groupLetter)
  return groupFs.length === 6 && groupFs.every(f => {
    const p = groupPredictions[f.id]
    return p?.home != null && p?.away != null
  })
}

// ANNEX_C is imported from @/lib/worldcup


// Match number → which Annex C column (which winner) that 3rd-place slot feeds
const ANNEX_C_MATCH_TO_COL = { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

/**
 * Given the top-8 qualifying 3rd-place groups, return a map of
 * matchNumber → team name for each 3rd-place R32 slot.
 */
function resolveAnnexC(top8groups, tables) {
  const key = [...top8groups].sort().join('')
  const entry = ANNEX_C[key]
  if (!entry) return {}  // should never happen with valid top-8 input
  // entry[col] = group letter whose 3rd-place team goes into that match
  const result = {}
  for (const [matchNum, col] of Object.entries(ANNEX_C_MATCH_TO_COL)) {
    const groupLetter = entry[col]
    result[Number(matchNum)] = tables[groupLetter]?.[2]?.team ?? 'TBD'
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
//  BRACKET RESOLUTION
//
//  resolveTeam(slotCode, tables, allThirds, annexMap, predictions, fixturesByMatchNum)
//  resolves any slot code to a team name:
//    "1A"        → group A winner
//    "2B"        → group B runner-up
//    "3ABCDF"    → the 3rd-place team assigned to this match via Annex C
//                  (looked up by match number of the fixture containing this slot)
//    "W73"       → winner of match 73 (recursively resolved)
//    "L101"      → loser of match 101 (recursively resolved)
// ─────────────────────────────────────────────────────────────────────────────

// ─── CHANGE 2 & 3: add fixtures param, check isGroupComplete ─────────────────
function resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures = [], depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'

  // Group winner / runner-up — only resolve if all 6 group matches are predicted
  if (/^[12][A-L]$/.test(slotCode)) {
    const groupLetter = slotCode[1]
    const pos = slotCode[0] === '1' ? 0 : 1
    if (!isGroupComplete(groupLetter, groupPredictions, fixtures)) return 'TBD'
    return tables[groupLetter]?.[pos]?.team ?? 'TBD'
  }

  // 3rd-place slot (e.g. "3ABCDF") — resolved via Annex C annexMap
  // annexMap is keyed by the match_number of the fixture containing this slot
  // We need to find which fixture has this slotCode and use its match_number
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    // annexMap is keyed by match number → team name, pre-computed
    // We look up by match number from the fixture context
    // This is handled by the caller passing the correct match number
    return null  // signal to caller to use match-number lookup
  }

  // Winner of match N
  if (slotCode.startsWith('W')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    // ─── CHANGE 4: pass fixtures through recursive calls ──────────────────────
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    return pred.home > pred.away ? t1 : pred.away > pred.home ? t2 : 'TBD'
  }

  // Loser of match N
  if (slotCode.startsWith('L')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    // ─── CHANGE 4 (continued): pass fixtures through recursive calls ──────────
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    return pred.away > pred.home ? t1 : pred.home > pred.away ? t2 : 'TBD'
  }

  return 'TBD'
}

// Resolve a slot code in the context of a specific fixture's match number
// This handles the 3rd-place slot codes by using the annexMap
// ─── CHANGE 5: add fixtures param, pass to resolveTeam ───────────────────────
function resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures = [], depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'

  // 3rd-place slot — only resolve once all 72 group matches are predicted
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    const allGroupsDone = GROUPS.every(g => isGroupComplete(g, groupPredictions, fixtures))
    if (!allGroupsDone) return 'TBD'
    return annexMap[matchNum] ?? 'TBD'
  }

  return resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth)
}

/**
 * Build the complete bracket resolution context from current predictions.
 * Returns annexMap (matchNum → 3rd-place team) and tables.
 */
function buildBracketContext(groupPredictions, fixtures, tables) {
  const allThirds = calcAllThirds(tables)
  const top8 = allThirds.slice(0, 8)
  const top8groups = top8.map(t => t.group)
  const annexMap = resolveAnnexC(top8groups, tables)
  return { annexMap, allThirds }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function FlagImg({ team, className = 'w-5 h-3' }) {
  const src = flagUrl(team)
  if (!src) return null
  return <img src={src} alt={team} className={`${className} object-cover rounded-sm flex-shrink-0`} />
}

function TeamCell({ team, align = 'left' }) {
  const isRight = align === 'right'
  return (
    <span className={`font-medium text-white flex items-center gap-1 flex-nowrap ${isRight ? 'justify-end' : ''}`}>
      {isRight && <span className="hidden sm:inline text-sm">{team}</span>}
      {isRight && <span className="sm:hidden text-xs">{shortName(team)}</span>}
      <FlagImg team={team} />
      {!isRight && <span className="hidden sm:inline text-sm">{team}</span>}
      {!isRight && <span className="sm:hidden text-xs">{shortName(team)}</span>}
    </span>
  )
}

function ScoreInput({ value, onChange, disabled }) {
  const empty = value == null || value === ''
  const highlight = !disabled && empty
  return (
    <input
      type="number" min="0" max="99"
      value={value ?? ''} placeholder="–"
      disabled={disabled}
      className={`w-9 text-center py-1 rounded-md text-sm font-bold outline-none transition-colors
        ${disabled
          ? 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
          : highlight
            ? 'bg-yellow-500/10 border border-yellow-500/50 text-white'
            : 'bg-gray-700 border border-gray-600 text-white'
        }`}
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
    />
  )
}

function GroupTablePanel({ predictions, fixtures, activeGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const displayGroup = selectedGroup || (activeGroup === 'ALL' ? 'A' : activeGroup)
  const tables = calcGroupTables(predictions, fixtures)
  const allThirds = calcAllThirds(tables)

  return (
    <div className="p-4 overflow-y-auto">
      <h3 className="font-bold text-yellow-400 mb-3 text-sm uppercase tracking-wider">Group Tables</h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setSelectedGroup(g)}
            className={`text-xs px-2 py-1 rounded font-bold transition-colors
              ${displayGroup === g ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Selected group table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Group {displayGroup}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">#</th>
              <th className="text-left px-3 py-2 text-gray-500">Team</th>
              <th className="px-2 py-2 text-gray-500">P</th>
              <th className="px-2 py-2 text-gray-500">GD</th>
              <th className="px-2 py-2 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(tables[displayGroup] || []).map((row, i) => (
              <tr key={row.team} className={`border-b border-gray-800/50 ${i < 2 ? 'bg-green-500/5' : ''}`}>
                <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} />
                    <span className="truncate max-w-24">{row.team}</span>
                    {i < 2 && <span className="text-green-400 text-xs">✓</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-gray-400">{row.played}</td>
                <td className={`px-2 py-2 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best 3rd place table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Best 3rd Place (Top 8 Advance)
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">#</th>
              <th className="text-left px-3 py-2 text-gray-500">Team</th>
              <th className="px-2 py-2 text-gray-500">Grp</th>
              <th className="px-2 py-2 text-gray-500">GD</th>
              <th className="px-2 py-2 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {allThirds.map((row, i) => (
              <tr key={row.group} className={`border-b border-gray-800/50 ${i < 8 ? 'bg-yellow-500/5' : 'opacity-50'}`}>
                <td className="px-3 py-2 text-gray-500">{i + 1}{i < 8 ? ' ✓' : ''}</td>
                <td className="px-3 py-2 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} />
                    <span className="truncate max-w-20">{row.team}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-yellow-400 font-bold">{row.group}</td>
                <td className={`px-2 py-2 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  BRACKET MODAL
// ─────────────────────────────────────────────────────────────────────────────

function BracketModal({ onClose, fixtures, groupPredictions, koPredictions, tables, annexMap, fixturesByMatchNum }) {
  const koFixtures = fixtures.filter(f => f.round !== 'group')

  const resolveSlot = (slotCode, matchNum) =>
    resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum)

  const getWinner = (f) => {
    const pred = koPredictions[f.id]
    if (!pred || pred.home == null || pred.away == null || pred.home === pred.away) return null
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    return pred.home > pred.away ? t1 : t2
  }

  // Build match card
  const MatchCard = ({ f, compact = false }) => {
    if (!f) return <div className="w-44 h-16 rounded-lg bg-gray-800/40 border border-gray-700/30" />
    const pred = koPredictions[f.id] || {}
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    const winner = getWinner(f)
    const hasPred = pred.home != null && pred.away != null
    const isTbd1 = t1 === 'TBD'
    const isTbd2 = t2 === 'TBD'

    const TeamRow = ({ team, score, isWinner, isTbd }) => (
      <div className={`flex items-center justify-between px-2 py-1 rounded
        ${isWinner ? 'bg-yellow-500/15' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {!isTbd && <FlagImg team={team} className="w-4 h-3 flex-shrink-0" />}
          <span className={`text-xs truncate max-w-[90px] ${isTbd ? 'text-gray-600 italic' : isWinner ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
            {isTbd ? 'TBD' : team}
          </span>
        </div>
        <span className={`text-xs font-bold ml-1 flex-shrink-0 ${isWinner ? 'text-yellow-400' : hasPred ? 'text-gray-400' : 'text-gray-700'}`}>
          {hasPred ? score : '–'}
        </span>
      </div>
    )

    return (
      <div className={`w-44 bg-gray-900 border rounded-lg overflow-hidden flex-shrink-0
        ${hasPred ? 'border-gray-600' : 'border-gray-700/50'}`}>
        <div className="px-2 pt-1 pb-0.5 text-[10px] text-gray-600 border-b border-gray-800">
          M{f.match_number}
        </div>
        <div className="p-1 space-y-0.5">
          <TeamRow team={t1} score={pred.home} isWinner={winner === t1 && !isTbd1} isTbd={isTbd1} />
          <TeamRow team={t2} score={pred.away} isWinner={winner === t2 && !isTbd2} isTbd={isTbd2} />
        </div>
      </div>
    )
  }

  const rounds = ['R32', 'R16', 'QF', 'SF', 'FINAL']
  const bronze = koFixtures.find(f => f.round === '3RD')

  // For each round, get fixtures in match_number order
  const roundFixtures = (round) => koFixtures.filter(f => f.round === round).sort((a, b) => a.match_number - b.match_number)

  // Connector line heights — used to visually pair matches between rounds
  // R32 has 16 matches → R16 has 8 → QF 4 → SF 2 → F 1
  // Each match card is ~80px tall, gap between pairs creates the tree structure

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0"
        onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-bold text-white">🏆 My Predicted Bracket</h2>
          <p className="text-xs text-gray-500 mt-0.5">Based on your current predictions · winner highlighted in gold</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
      </div>

      {/* Scrollable bracket area */}
      <div className="flex-1 overflow-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex gap-6 items-start min-w-max">

          {rounds.map((round, roundIdx) => {
            const fs = roundFixtures(round)
            // Card height + gap unit. Each successive round doubles the slot height.
            const CARD_H = 80   // px — approximate rendered height of one MatchCard
            const BASE_GAP = 8  // px — gap between cards in R32
            const slotH = (CARD_H + BASE_GAP) * Math.pow(2, roundIdx)

            return (
              <div key={round} className="flex flex-col flex-shrink-0">
                {/* Round label */}
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 text-center w-44">
                  {ROUND_LABELS[round]}
                </div>
                {/* Match cards — each sits in a slot of slotH, centred vertically */}
                <div className="flex flex-col">
                  {fs.map((f) => (
                    <div key={f.id}
                      style={{ height: `${slotH}px` }}
                      className="flex items-center">
                      <MatchCard f={f} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Bronze play-off — separate column, aligned at top */}
          {bronze && (
            <div className="flex flex-col flex-shrink-0 opacity-75 ml-4">
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 text-center w-44">
                Bronze Final
              </div>
              <div style={{ height: `${(80 + 8) * 8}px` }} className="flex items-start pt-2">
                <MatchCard f={bronze} />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" /> predicted winner</span>
          <span className="flex items-center gap-1"><span className="text-gray-600 italic">TBD</span> = team not yet determined from your predictions</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  ODDS PIE — football-textured pie chart showing implied probabilities
// ─────────────────────────────────────────────────────────────────────────────

function OddsPie({ homePct, drawPct, awayPct, homeTeam, awayTeam }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 178, H = 178, cx = 89, cy = 89, R = 86

    const probs = [homePct / 100, drawPct / 100, awayPct / 100]
    const light = ['#4a90d9', '#aaaaaa', '#e05555']
    const dark  = ['#0a3d7a', '#3a3a3a', '#7a0f0f']

    // Draw football texture offscreen
    const off = document.createElement('canvas')
    off.width = W; off.height = H
    const o = off.getContext('2d')

    // White base
    o.fillStyle = '#fff'
    o.beginPath(); o.arc(cx, cy, R, 0, Math.PI * 2); o.fill()

    // Classic pentagon patches
    function pentagon(c, x, y, r, rot) {
      c.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = rot + i * Math.PI * 2 / 5
        i === 0 ? c.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
                : c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
      }
      c.closePath()
    }

    o.fillStyle = '#111'
    pentagon(o, cx, cy, 18, -Math.PI / 2); o.fill()
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5
      pentagon(o, cx + 40 * Math.cos(a), cy + 40 * Math.sin(a), 15, a + Math.PI / 5)
      o.fill()
    }
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i + 0.5) * Math.PI * 2 / 5
      pentagon(o, cx + 70 * Math.cos(a), cy + 70 * Math.sin(a), 12, a)
      o.fill()
    }

    const fd = o.getImageData(0, 0, W, H).data

    // Segment angle boundaries
    const angles = []
    let cum = -Math.PI / 2
    for (const p of probs) { angles.push(cum); cum += p * Math.PI * 2 }
    angles.push(cum)

    // Paint pixels
    const out = ctx.createImageData(W, H)
    const od = out.data
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const i = (y * W + x) * 4
        if (dist > R) { od[i + 3] = 0; continue }

        let angle = Math.atan2(dy, dx)
        let seg = probs.length - 1
        for (let s = 0; s < probs.length; s++) {
          let a = angle
          while (a < angles[s] - 0.001) a += Math.PI * 2
          if (a >= angles[s] && a < angles[s + 1]) { seg = s; break }
        }

        const brightness = (fd[i] + fd[i + 1] + fd[i + 2]) / 3
        const t = brightness / 255
        const lc = light[seg], dc = dark[seg]
        const lr = parseInt(lc.slice(1, 3), 16), lg = parseInt(lc.slice(3, 5), 16), lb = parseInt(lc.slice(5, 7), 16)
        const dr = parseInt(dc.slice(1, 3), 16), dg = parseInt(dc.slice(3, 5), 16), db = parseInt(dc.slice(5, 7), 16)
        od[i]     = Math.round(dr + (lr - dr) * t)
        od[i + 1] = Math.round(dg + (lg - dg) * t)
        od[i + 2] = Math.round(db + (lb - db) * t)
        od[i + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)

    // Dividers
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5
    for (let s = 0; s < probs.length; s++) {
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + R * Math.cos(angles[s]), cy + R * Math.sin(angles[s]))
      ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke()

    // Labels
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const labels = [`${homePct}%`, `${drawPct}%`, `${awayPct}%`]
    for (let s = 0; s < probs.length; s++) {
      const mid = angles[s] + probs[s] * Math.PI
      const lx = cx + R * 0.6 * Math.cos(mid)
      const ly = cy + R * 0.6 * Math.sin(mid)
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4
      ctx.fillStyle = 'white'; ctx.fillText(labels[s], lx, ly)
    }
    ctx.restore()
  }, [homePct, drawPct, awayPct])

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-52 shadow-xl">
      <div className="text-xs text-gray-400 text-center mb-3 font-medium truncate">
        {homeTeam} vs {awayTeam}
      </div>
      <canvas ref={canvasRef} width="178" height="178"
        className="block mx-auto rounded-full" />
      <div className="mt-3 space-y-1.5">
        {[
          { label: `${homeTeam} win`, pct: homePct, color: '#1a5fa8' },
          { label: 'Draw',           pct: drawPct,  color: '#777' },
          { label: `${awayTeam} win`, pct: awayPct, color: '#b71c1c' },
        ].map(({ label, pct, color }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="truncate">{label}</span>
            </div>
            <span className="font-medium text-white ml-2">{pct}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-800 text-center text-xs text-gray-600">
        Market implied probability
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  ODDS POPOVER — portal-based so it escapes all scroll/clip boundaries
// ─────────────────────────────────────────────────────────────────────────────

function OddsPopover({ rect, odds, homeTeam, awayTeam, onClose }) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!rect) return null

  const popoverH = 320
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow > popoverH ? rect.bottom + 6 : rect.top - popoverH - 6
  const right = window.innerWidth - rect.right

  return createPortal(
    <div
      style={{ position: 'fixed', top, right, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      <OddsPie
        homePct={Math.round(odds.home_prob)}
        drawPct={Math.round(odds.draw_prob)}
        awayPct={Math.round(odds.away_prob)}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>,
    document.body
  )
}

function StarPickStrip({ round, pick, roundLocked, valid, noTeamsYet, onOpen, onClear, inline = false }) {
  if (inline) {
    // Compact version for KO round headers
    return (
      <div className="flex items-center gap-2">
        {pick && !roundLocked && (
          <>
            <FlagImg team={pick} />
            <span className="text-xs text-yellow-400 font-medium">⭐ {pick}</span>
            {!valid && <span className="text-xs text-amber-400">⚠</span>}
            <button onClick={onClear} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
          </>
        )}
        {pick && roundLocked && (
          <>
            <FlagImg team={pick} />
            <span className="text-xs text-yellow-400">⭐ {pick}</span>
            <span className="text-xs text-gray-600">🔒</span>
          </>
        )}
        {!pick && !roundLocked && (
          <button
            onClick={onOpen}
            disabled={noTeamsYet}
            className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⭐ Star pick
          </button>
        )}
        {!pick && roundLocked && (
          <span className="text-xs text-gray-600">No star pick 🔒</span>
        )}
        {!roundLocked && pick && (
          <button onClick={onOpen} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">change</button>
        )}
      </div>
    )
  }

  // Full-width version for group stage
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-800
      ${roundLocked ? 'bg-gray-800/30' : 'bg-yellow-500/5'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">⭐ Group Stage Star Pick</span>
        {pick && (
          <>
            <FlagImg team={pick} />
            <span className="text-xs text-yellow-400 font-medium">{pick}</span>
            {!valid && <span className="text-xs text-amber-400">⚠ team not in group</span>}
          </>
        )}
        {!pick && !roundLocked && <span className="text-xs text-gray-500">None selected</span>}
        {roundLocked && <span className="text-xs text-gray-600">🔒 Locked</span>}
      </div>
      {!roundLocked && (
        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="text-xs px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            {pick ? 'Change' : 'Pick team'}
          </button>
          {pick && (
            <button onClick={onClear} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PredictionsClient({
  league, fixtures, existingPredictions,
  extrasPrediction, userId, profile, leagueId, fixtureOdds = {}
}) {
  const locked = isLocked()
  const [activeGroup, setActiveGroup] = useState('A')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [toast, setToast] = useState(null)
  const [showMobileTables, setShowMobileTables] = useState(false)
  const [showBracketModal, setShowBracketModal] = useState(false)
  const [oddsOpen, setOddsOpen] = useState(null) // { fixtureId, rect, odds, homeTeam, awayTeam }
  const [starPickRound, setStarPickRound] = useState(null) // which round's picker is open
  const saveTimers = useRef({})
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const [groupPredictions, setGroupPredictions] = useState(() => {
    const map = {}
    for (const p of existingPredictions.filter(p => {
      const f = fixtures.find(f => f.id === p.fixture_id)
      return f?.round === 'group'
    })) {
      map[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away }
    }
    return map
  })

  const [koPredictions, setKoPredictions] = useState(() => {
    const map = {}
    for (const p of existingPredictions.filter(p => {
      const f = fixtures.find(f => f.id === p.fixture_id)
      return f?.round !== 'group'
    })) {
      map[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away }
    }
    return map
  })

  const [extras, setExtras] = useState({
    redcards: extrasPrediction?.predicted_red_cards ?? null,
    goals: extrasPrediction?.predicted_total_goals ?? null,
  })
  const [starPicks, setStarPicks] = useState({
    group: extrasPrediction?.star_pick_group ?? null,
    R32:   extrasPrediction?.star_pick_r32   ?? null,
    R16:   extrasPrediction?.star_pick_r16   ?? null,
    QF:    extrasPrediction?.star_pick_qf    ?? null,
    SF:    extrasPrediction?.star_pick_sf    ?? null,
    FINAL: extrasPrediction?.star_pick_final ?? null,
  })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const savePrediction = useCallback(async (fixtureId, home, away) => {
    if (locked) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId, league_id: leagueId, fixture_id: fixtureId,
        predicted_home: home, predicted_away: away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id,fixture_id' })
    if (error) showToast('Save failed', 'error')
    else setSaveStatus('saved')
  }, [locked, userId, leagueId, supabase])

  const updateGroupPrediction = (fixtureId, side, value) => {
    if (locked) return
    setGroupPredictions(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const p = updated[fixtureId]
      if (p.home != null && p.away != null) {
        setSaveStatus('unsaved')
        clearTimeout(saveTimers.current[fixtureId])
        saveTimers.current[fixtureId] = setTimeout(() => savePrediction(fixtureId, p.home, p.away), 800)
      }
      return updated
    })
  }

  const updateKoPrediction = (fixtureId, side, value) => {
    if (locked) return
    setKoPredictions(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const p = updated[fixtureId]
      if (p.home != null && p.away != null) {
        setSaveStatus('unsaved')
        clearTimeout(saveTimers.current[fixtureId])
        saveTimers.current[fixtureId] = setTimeout(() => savePrediction(fixtureId, p.home, p.away), 800)
      }
      return updated
    })
  }

  const saveExtras = async (newExtras, newStarPicks) => {
    const { error } = await supabase
      .from('extras_predictions')
      .upsert({
        user_id: userId, league_id: leagueId,
        predicted_red_cards: newExtras.redcards,
        predicted_total_goals: newExtras.goals,
        star_pick_group: newStarPicks.group,
        star_pick_r32:   newStarPicks.R32,
        star_pick_r16:   newStarPicks.R16,
        star_pick_qf:    newStarPicks.QF,
        star_pick_sf:    newStarPicks.SF,
        star_pick_final: newStarPicks.FINAL,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id' })
    if (!error) showToast('Saved ✓')
    else showToast('Save failed', 'error')
  }

  const saveStarPick = async (round, team) => {
    const newStarPicks = { ...starPicks, [round]: team }
    setStarPicks(newStarPicks)
    setStarPickRound(null)
    const colMap = { group: 'star_pick_group', R32: 'star_pick_r32', R16: 'star_pick_r16', QF: 'star_pick_qf', SF: 'star_pick_sf', FINAL: 'star_pick_final' }
    const { error } = await supabase
      .from('extras_predictions')
      .upsert({
        user_id: userId, league_id: leagueId,
        [colMap[round]]: team,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id' })
    if (error) showToast('Save failed', 'error')
    else showToast(`⭐ Star pick saved for ${ROUND_LABELS[round] || round}`)
  }

  // ── Derived bracket state (recomputed on every prediction change) ──────────

  const groupFixtures    = fixtures.filter(f => f.round === 'group')
  const koFixtures       = fixtures.filter(f => f.round !== 'group')
  const filteredFixtures = activeGroup === 'ALL' ? groupFixtures : groupFixtures.filter(f => f.match_group === activeGroup)

  const totalGroupPredictions = groupFixtures.filter(f => {
    const p = groupPredictions[f.id]
    return p?.home != null && p?.away != null
  }).length

  const totalKoPredictions = koFixtures.filter(f => {
    const p = koPredictions[f.id]
    return p?.home != null && p?.away != null
  }).length

  const totalPredictions = totalGroupPredictions + totalKoPredictions
  const progressPct = Math.round((totalGroupPredictions / 72) * 100)

  // Build fixture index by match_number for KO resolution
  const fixturesByMatchNum = {}
  for (const f of fixtures) {
    if (f.match_number) fixturesByMatchNum[f.match_number] = f
  }

  // Group tables — update live as group predictions change
  const tables = calcGroupTables(groupPredictions, fixtures)

  // Annex C — build from current top-8 thirds
  const { annexMap } = buildBracketContext(groupPredictions, fixtures, tables)

  // ─── CHANGE 6: pass fixtures to resolve helper ────────────────────────────
  // Resolve a team for a given slot code + the fixture's match number context
  const resolve = (slotCode, matchNum) =>
    resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures)

  // ── Per-round star pick helpers ──────────────────────────────────────────────

  // Lock time for each round = kickoff of first fixture in that round
  const roundLockTimes = {}
  const starPickRounds = ['group', 'R32', 'R16', 'QF', 'SF', 'FINAL']
  for (const round of starPickRounds) {
    const key = round === 'group' ? 'group' : round
    const roundFs = fixtures.filter(f => f.round === (round === 'group' ? 'group' : round))
    if (roundFs.length) {
      const earliest = roundFs.reduce((a, b) => new Date(a.kickoff_utc) < new Date(b.kickoff_utc) ? a : b)
      roundLockTimes[round] = new Date(earliest.kickoff_utc)
    }
  }
  const isRoundLocked = (round) => {
    const lockTime = roundLockTimes[round]
    return lockTime ? new Date() >= lockTime : false
  }

  // Teams available for star pick per round — derived from bracket resolution
  const teamsForRound = (round) => {
    if (round === 'group') return Object.values(GROUP_TEAMS).flat().sort()
    const roundFs = koFixtures.filter(f => f.round === round)
    const teams = new Set()
    for (const f of roundFs) {
      const t1 = resolve(f.slot1 || f.home_team, f.match_number)
      const t2 = resolve(f.slot2 || f.away_team, f.match_number)
      if (t1 && t1 !== 'TBD') teams.add(t1)
      if (t2 && t2 !== 'TBD') teams.add(t2)
    }
    return [...teams].sort()
  }

  // Check if a star pick is still valid (team is in the predicted bracket for that round)
  const isStarPickValid = (round, team) => {
    if (!team) return true
    if (round === 'group') return true // all 48 always valid
    return teamsForRound(round).includes(team)
  }

  const roundOrder = ['R32','R16','QF','SF','3RD','FINAL']

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/dashboard/league/${leagueId}`} className="text-gray-400 hover:text-white text-sm">
          ← {league?.league_name}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span title="Group stage">{totalGroupPredictions}/72</span>
            <span className="text-gray-700">·</span>
            <span title="Knockout stage">{totalKoPredictions}/32 KO</span>
            <span className="text-gray-700">·</span>
            <span className={totalPredictions === 104 ? 'text-green-400 font-medium' : ''}>{totalPredictions}/104</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-400' : saveStatus === 'saving' ? 'bg-yellow-400' : 'bg-red-400'}`}/>
            <span className="text-xs text-gray-500">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${locked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {locked ? '🔒 Locked' : '🔓 Open'}
          </div>
        </div>
      </nav>

      <div className="flex">
        <div className="flex-1 p-4 pb-24 overflow-x-auto">

          {/* Progress */}
          <div className="mb-4 space-y-2">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Group stage</span>
                <span>{totalGroupPredictions}/72 · {progressPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}/>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Knockout stage</span>
                <span>{totalKoPredictions}/32 · {Math.round((totalKoPredictions / 32) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${Math.round((totalKoPredictions / 32) * 100)}%` }}/>
              </div>
            </div>
          </div>

          {/* Group tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {GROUPS.map(g => {
              const done = groupFixtures.filter(f => f.match_group === g)
                .every(f => { const p = groupPredictions[f.id]; return p?.home != null && p?.away != null })
              return (
                <button key={g} onClick={() => setActiveGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                    ${activeGroup === g ? 'bg-yellow-500 text-gray-950'
                      : done ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {g} {done ? '✓' : ''}
                </button>
              )
            })}
            <button onClick={() => setActiveGroup('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${activeGroup === 'ALL' ? 'bg-yellow-500 text-gray-950'
                  : GROUPS.every(g => groupFixtures.filter(f => f.match_group === g).every(f => { const p = groupPredictions[f.id]; return p?.home != null && p?.away != null }))
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-800 text-gray-400'}`}>
              {GROUPS.every(g => groupFixtures.filter(f => f.match_group === g).every(f => { const p = groupPredictions[f.id]; return p?.home != null && p?.away != null })) ? 'All ✓' : 'All'}
            </button>
          </div>

          {/* Group match table */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            {/* Group stage star pick */}
            <StarPickStrip
              round="group"
              pick={starPicks.group}
              roundLocked={isRoundLocked('group')}
              valid={isStarPickValid('group', starPicks.group)}
              onOpen={() => setStarPickRound('group')}
              onClear={() => saveStarPick('group', null)}
            />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-yellow-500/5">
                  <th className="px-2 py-2 text-right text-xs text-gray-500">Home</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">H</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-4">–</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">A</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-500">Away</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredFixtures.map(f => {
                  const pred = groupPredictions[f.id] || {}
                  const odds = fixtureOdds[f.id]
                  const oddsIsOpen = oddsOpen?.fixtureId === f.id
                  return (
                    <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-2 py-2 text-right">
                        <TeamCell team={f.home_team} align="right" />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput value={pred.home} onChange={v => updateGroupPrediction(f.id, 'home', v)} disabled={locked}/>
                      </td>
                      <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput value={pred.away} onChange={v => updateGroupPrediction(f.id, 'away', v)} disabled={locked}/>
                      </td>
                      <td className="px-2 py-2">
                        <TeamCell team={f.away_team} align="left" />
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                        {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {odds && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (oddsIsOpen) { setOddsOpen(null); return }
                              const rect = e.currentTarget.getBoundingClientRect()
                              setOddsOpen({ fixtureId: f.id, rect, odds, homeTeam: f.home_team, awayTeam: f.away_team })
                            }}
                            className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 rounded border transition-colors
                              ${oddsIsOpen
                                ? 'border-gray-500 text-gray-300 bg-gray-800'
                                : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <rect x="0" y="5" width="3" height="7" rx="1" fill="currentColor"/>
                              <rect x="4" y="3" width="3" height="9" rx="1" fill="currentColor"/>
                              <rect x="8" y="0.5" width="3" height="11.5" rx="1" fill="currentColor"/>
                            </svg>
                            %
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* KO bracket — always shown, TBD until teams are known */}
          <div className="mt-8">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-yellow-400 text-sm font-medium">⚡ Knockout bracket</p>
                <p className="text-gray-500 text-xs mt-1">
                  Teams update live as you enter predictions. Complete all 72 group matches to finalise the R32 draw.
                  Enter a score for each KO match to advance teams to the next round.
                </p>
              </div>
              <button
                onClick={() => setShowBracketModal(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                🏆 View bracket
              </button>
            </div>

            {roundOrder.map(round => {
              const roundFixtures = koFixtures.filter(f => f.round === round)
              const starRound = round === '3RD' ? 'FINAL' : round // bronze uses FINAL pick
              const pick = starPicks[starRound]
              const roundLocked = isRoundLocked(starRound)
              const availableTeams = teamsForRound(starRound)
              const noTeamsYet = availableTeams.length === 0
              return (
                <div key={round} className="mt-5">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      {ROUND_LABELS[round]}
                    </span>
                    {round !== '3RD' && (
                      <StarPickStrip
                        round={starRound}
                        pick={pick}
                        roundLocked={roundLocked}
                        valid={isStarPickValid(starRound, pick)}
                        noTeamsYet={noTeamsYet}
                        onOpen={() => setStarPickRound(starRound)}
                        onClear={() => saveStarPick(starRound, null)}
                        inline
                      />
                    )}
                    {round === '3RD' && (
                      <span className="text-xs text-gray-600">Uses Final star pick</span>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {roundFixtures.map(f => {
                          const pred = koPredictions[f.id] || {}
                          const t1 = resolve(f.slot1, f.match_number)
                          const t2 = resolve(f.slot2, f.match_number)
                          const hasDraw = pred.home != null && pred.away != null && pred.home === pred.away
                          return (
                            <Fragment key={f.id}>
                              <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-2 py-2 text-right">
                                  {t1 === 'TBD'
                                    ? <span className="text-gray-600 text-xs italic">TBD</span>
                                    : <TeamCell team={t1} align="right" />}
                                </td>
                                <td className="px-1 py-2 text-center">
                                  <ScoreInput value={pred.home} onChange={v => updateKoPrediction(f.id, 'home', v)} disabled={locked || t1 === 'TBD' || t2 === 'TBD'}/>
                                </td>
                                <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                                <td className="px-1 py-2 text-center">
                                  <ScoreInput value={pred.away} onChange={v => updateKoPrediction(f.id, 'away', v)} disabled={locked || t1 === 'TBD' || t2 === 'TBD'}/>
                                </td>
                                <td className="px-2 py-2">
                                  {t2 === 'TBD'
                                    ? <span className="text-gray-600 text-xs italic">TBD</span>
                                    : <TeamCell team={t2} align="left" />}
                                </td>
                                <td className="px-2 py-2 text-right hidden md:table-cell">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">
                                    {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                </td>
                              </tr>
                              {hasDraw && (
                                <tr className="border-b border-yellow-500/30 bg-yellow-500/10">
                                  <td colSpan={6} className="px-3 py-1.5 text-xs text-yellow-400 text-center">
                                    ⚠️ Knockout matches can't end in a draw — give the team you think wins on penalties +1 goal
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!pick && !roundLocked && !noTeamsYet && round !== '3RD' && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-yellow-500/70 py-1">
                      <span>⭐</span>
                      <span>Don't forget to set your Star Pick for this round</span>
                      <button onClick={() => setStarPickRound(starRound)} className="underline hover:text-yellow-400">Pick now</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Extras */}
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="font-bold text-lg mb-1">🎯 Tournament Extras</h3>
            <p className="text-gray-500 text-sm mb-4">Closest answer wins 50 points each</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Red Cards</label>
                <input type="number" min="0" value={extras.redcards ?? ''} disabled={locked} placeholder="e.g. 24"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  onChange={e => setExtras(prev => ({ ...prev, redcards: e.target.value === '' ? null : parseInt(e.target.value) }))}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Goals (excl. pens)</label>
                <input type="number" min="0" value={extras.goals ?? ''} disabled={locked} placeholder="e.g. 142"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  onChange={e => setExtras(prev => ({ ...prev, goals: e.target.value === '' ? null : parseInt(e.target.value) }))}/>
                {(() => {
                  const sum = [
                    ...Object.values(groupPredictions),
                    ...Object.values(koPredictions),
                  ].reduce((acc, p) => acc + (p.home ?? 0) + (p.away ?? 0), 0)
                  const filled = [
                    ...Object.values(groupPredictions),
                    ...Object.values(koPredictions),
                  ].filter(p => p.home != null && p.away != null).length
                  if (filled === 0) return null
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                      Your predicted match goals so far: <span className="text-yellow-400 font-medium">{sum}</span>
                      {filled < 104 && <span className="text-gray-600"> ({filled}/104 matches filled)</span>}
                    </p>
                  )
                })()}
              </div>
            </div>
            {!locked && (
              <button onClick={() => saveExtras(extras, starPicks)}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg text-sm transition-colors">
                Save Extras
              </button>
            )}
          </div>

        </div>

        {/* Mobile tables button */}
        <div className="lg:hidden fixed bottom-16 right-4 z-30">
          <button onClick={() => setShowMobileTables(prev => !prev)}
            className="bg-yellow-500 text-gray-950 font-bold rounded-full px-4 py-2 text-sm shadow-lg">
            📊 Tables
          </button>
        </div>

        {/* Mobile tables drawer */}
        {showMobileTables && (
          <div className="lg:hidden fixed inset-0 bg-gray-950 z-40 overflow-y-auto pb-20">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="font-bold text-yellow-400">Group Tables</span>
              <button onClick={() => setShowMobileTables(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <GroupTablePanel predictions={groupPredictions} fixtures={fixtures} activeGroup={activeGroup}/>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-72 border-l border-gray-800 bg-gray-900/50">
          <GroupTablePanel predictions={groupPredictions} fixtures={fixtures} activeGroup={activeGroup}/>
        </div>
      </div>

      {/* Star pick modal — per round */}
      {starPickRound && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setStarPickRound(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg">⭐ Star Pick</h3>
              <button onClick={() => setStarPickRound(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {starPickRound === 'group' ? 'Group Stage' :
               starPickRound === 'R32' ? 'Round of 32' :
               starPickRound === 'R16' ? 'Round of 16' :
               starPickRound === 'QF' ? 'Quarter Finals' :
               starPickRound === 'SF' ? 'Semi Finals' : 'The Final'} — points doubled for this team's match
            </p>
            {(() => {
              const teams = teamsForRound(starPickRound)
              const current = starPicks[starPickRound]
              if (teams.length === 0) return (
                <p className="text-gray-500 text-sm text-center py-4">No teams resolved yet — fill in your predictions first.</p>
              )
              return (
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(team => (
                    <button key={team}
                      onClick={() => saveStarPick(starPickRound, team)}
                      className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 transition-colors
                        ${current === team ? 'bg-yellow-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      <FlagImg team={team} />
                      <span className="truncate">{team}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
            {starPicks[starPickRound] && (
              <button onClick={() => saveStarPick(starPickRound, null)}
                className="w-full mt-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50 transition-colors">
                Remove Star Pick
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bracket modal */}
      {showBracketModal && (
        <BracketModal
          onClose={() => setShowBracketModal(false)}
          fixtures={fixtures}
          groupPredictions={groupPredictions}
          koPredictions={koPredictions}
          tables={tables}
          annexMap={annexMap}
          fixturesByMatchNum={fixturesByMatchNum}
        />
      )}

      {/* Odds popover — portal rendered over everything */}
      {oddsOpen && (
        <OddsPopover
          rect={oddsOpen.rect}
          odds={oddsOpen.odds}
          homeTeam={oddsOpen.homeTeam}
          awayTeam={oddsOpen.awayTeam}
          onClose={() => setOddsOpen(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}