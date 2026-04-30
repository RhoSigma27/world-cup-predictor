'use client'

import { useState, useEffect } from 'react'
import {
  GROUPS, GROUP_TEAMS, ANNEX_C, ROUND_LABELS, flagUrl,
} from '@/lib/worldcup'

// ─── Re-implemented bracket helpers (mirrors PredictionsClient.js logic) ──────

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
    else { stats[f.home_team].pts++; stats[f.away_team].pts++ }
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

function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

function isGroupComplete(groupLetter, groupPredictions, fixtures) {
  const groupFs = fixtures.filter(f => f.round === 'group' && f.match_group === groupLetter)
  return groupFs.length === 6 && groupFs.every(f => {
    const p = groupPredictions[f.id]
    return p?.home != null && p?.away != null
  })
}

const ANNEX_C_MATCH_TO_COL = { 79: 0, 85: 1, 81: 2, 74: 3, 82: 4, 77: 5, 87: 6, 80: 7 }

function resolveAnnexC(top8groups, tables) {
  const key = [...top8groups].sort().join('')
  const entry = ANNEX_C[key]
  if (!entry) return {}
  const result = {}
  for (const [matchNum, col] of Object.entries(ANNEX_C_MATCH_TO_COL)) {
    const groupLetter = entry[col]
    result[Number(matchNum)] = tables[groupLetter]?.[2]?.team ?? 'TBD'
  }
  return result
}

function resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures = [], depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'
  if (/^[12][A-L]$/.test(slotCode)) {
    const groupLetter = slotCode[1]
    const pos = slotCode[0] === '1' ? 0 : 1
    if (!isGroupComplete(groupLetter, groupPredictions, fixtures)) return 'TBD'
    return tables[groupLetter]?.[pos]?.team ?? 'TBD'
  }
  if (/^3[A-L]{2,}$/.test(slotCode)) return null
  if (slotCode.startsWith('W')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    return pred.home > pred.away ? t1 : pred.away > pred.home ? t2 : 'TBD'
  }
  if (slotCode.startsWith('L')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth + 1)
    return pred.away > pred.home ? t1 : pred.home > pred.away ? t2 : 'TBD'
  }
  return 'TBD'
}

function resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures = [], depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    const allGroupsDone = GROUPS.every(g => isGroupComplete(g, groupPredictions, fixtures))
    if (!allGroupsDone) return 'TBD'
    return annexMap[matchNum] ?? 'TBD'
  }
  return resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures, depth)
}

// ─── FlagImg ──────────────────────────────────────────────────────────────────
function FlagImg({ team, className = 'w-4 h-3' }) {
  const src = flagUrl(team)
  if (!src) return null
  return <img src={src} alt={team} className={`${className} object-cover rounded-sm flex-shrink-0`} />
}

// ─── The read-only bracket view ───────────────────────────────────────────────
function BracketView({ fixtures, groupPredictions, koPredictions, tables, annexMap, fixturesByMatchNum }) {
  const koFixtures = fixtures.filter(f => f.round !== 'group')

  const resolveSlot = (slotCode, matchNum) =>
    resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, fixtures)

  const getWinner = (f) => {
    const pred = koPredictions[f.id]
    if (!pred || pred.home == null || pred.away == null || pred.home === pred.away) return null
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    return pred.home > pred.away ? t1 : t2
  }

  const MatchCard = ({ f }) => {
    if (!f) return <div className="w-44 h-16 rounded-lg bg-gray-800/40 border border-gray-700/30" />
    const pred = koPredictions[f.id] || {}
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    const winner = getWinner(f)
    const hasPred = pred.home != null && pred.away != null
    const isTbd1 = t1 === 'TBD'
    const isTbd2 = t2 === 'TBD'

    const TeamRow = ({ team, score, isWinner, isTbd }) => (
      <div className={`flex items-center justify-between px-2 py-1 rounded ${isWinner ? 'bg-yellow-500/15' : ''}`}>
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
      <div className={`w-44 bg-gray-900 border rounded-lg overflow-hidden flex-shrink-0 ${hasPred ? 'border-gray-600' : 'border-gray-700/50'}`}>
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
  const roundFixtures = (round) => koFixtures.filter(f => f.round === round).sort((a, b) => a.match_number - b.match_number)

  return (
    <div className="flex gap-6 items-start min-w-max">
      {rounds.map((round, roundIdx) => {
        const fs = roundFixtures(round)
        const CARD_H = 80
        const BASE_GAP = 8
        const slotH = (CARD_H + BASE_GAP) * Math.pow(2, roundIdx)
        return (
          <div key={round} className="flex flex-col flex-shrink-0">
            <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 text-center w-44">
              {ROUND_LABELS[round]}
            </div>
            <div className="flex flex-col">
              {fs.map((f) => (
                <div key={f.id} style={{ height: `${slotH}px` }} className="flex items-center">
                  <MatchCard f={f} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
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
  )
}

// ─── Main exported modal ──────────────────────────────────────────────────────
export default function MemberBracketModal({ member, leagueId, fixtures, onClose }) {
  const [state, setState] = useState('loading') // loading | error | ready
  const [errorMsg, setErrorMsg] = useState('')
  const [groupPredictions, setGroupPredictions] = useState({})
  const [koPredictions, setKoPredictions] = useState({})
  const [displayName, setDisplayName] = useState(member.displayName)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/member-predictions?userId=${encodeURIComponent(member.userId)}&leagueId=${encodeURIComponent(leagueId)}`
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setErrorMsg(data.error || 'Failed to load predictions')
          setState('error')
          return
        }
        const { predictions, displayName: name } = await res.json()
        setDisplayName(name)

        // Split into group vs KO prediction maps
        const groupMap = {}
        const koMap = {}
        for (const p of predictions) {
          const f = fixtures.find(fx => fx.id === p.fixture_id)
          if (!f) continue
          const entry = { home: p.predicted_home, away: p.predicted_away }
          if (f.round === 'group') groupMap[p.fixture_id] = entry
          else koMap[p.fixture_id] = entry
        }
        setGroupPredictions(groupMap)
        setKoPredictions(koMap)
        setState('ready')
      } catch (err) {
        setErrorMsg('Something went wrong loading predictions')
        setState('error')
      }
    }
    load()
  }, [member.userId, leagueId, fixtures])

  // Precompute bracket context once ready
  const fixturesByMatchNum = {}
  for (const f of fixtures) {
    if (f.match_number) fixturesByMatchNum[f.match_number] = f
  }

  const tables = calcGroupTables(groupPredictions, fixtures)
  const allThirds = calcAllThirds(tables)
  const top8 = allThirds.slice(0, 8)
  const top8groups = top8.map(t => t.group)
  const annexMap = resolveAnnexC(top8groups, tables)

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="font-bold text-white">🏆 {displayName}'s Predicted Bracket</h2>
          <p className="text-xs text-gray-500 mt-0.5">Read-only · winner highlighted in gold</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6" onClick={e => e.stopPropagation()}>
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading {displayName}'s predictions…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="text-4xl">😕</div>
            <p className="text-gray-400">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {state === 'ready' && (
          <>
            <BracketView
              fixtures={fixtures}
              groupPredictions={groupPredictions}
              koPredictions={koPredictions}
              tables={tables}
              annexMap={annexMap}
              fixturesByMatchNum={fixturesByMatchNum}
            />
            <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" />
                predicted winner
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-600 italic">TBD</span> = team not yet determined from their predictions
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}