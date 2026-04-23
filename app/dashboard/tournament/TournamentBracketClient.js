'use client'

import {
  GROUPS, GROUP_TEAMS, COUNTRY_CODES, ANNEX_C,
  ROUND_LABELS, shortName, flagUrl,
} from '@/lib/worldcup'
import { useState } from 'react'

function FlagImg({ team }) {
  const src = flagUrl(team)
  if (!src) return null
  return <img src={src} alt={team} className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
}

// Determine the winner of a fixture accounting for penalties
function getWinner(f) {
  if (f.home_score == null || f.away_score == null) return null
  if (f.home_score > f.away_score) return f.home_team
  if (f.away_score > f.home_score) return f.away_team
  return f.penalty_winner || null
}

function MatchCard({ f }) {
  if (!f) return (
    <div className="w-44 h-[72px] rounded-lg bg-gray-800/30 border border-gray-700/20 flex-shrink-0" />
  )

  const hasResult = f.home_score != null && f.away_score != null
  const winner = getWinner(f)
  const isPens = hasResult && f.home_score === f.away_score && f.penalty_winner
  const t1 = f.home_team
  const t2 = f.away_team
  const t1Known = t1 && t1 !== 'TBD'
  const t2Known = t2 && t2 !== 'TBD'

  const TeamRow = ({ team, score, isWinner, isHome }) => {
    const known = team && team !== 'TBD'
    return (
      <div className={`flex items-center justify-between px-2 py-1 rounded
        ${isWinner ? 'bg-yellow-500/15' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {known ? <FlagImg team={team} /> : <div className="w-4 h-3 bg-gray-700 rounded-sm flex-shrink-0" />}
          <span className={`text-xs truncate max-w-[80px]
            ${!known ? 'text-gray-600 italic' : isWinner ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
            {known ? team : 'TBD'}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {hasResult && (
            <span className={`text-xs font-bold ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`}>
              {score}
            </span>
          )}
          {isWinner && isPens && (
            <span className="text-[10px] text-amber-400 font-medium">(p)</span>
          )}
          {isWinner && !hasResult && <span className="text-gray-700 text-xs">–</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-44 bg-gray-900 border rounded-lg overflow-hidden flex-shrink-0 transition-colors
      ${hasResult && winner ? 'border-gray-600' : hasResult ? 'border-amber-500/40' : 'border-gray-700/50'}`}>
      <div className="px-2 pt-1 pb-0.5 text-[10px] text-gray-600 border-b border-gray-800 flex justify-between">
        <span>M{f.match_number}</span>
        {f.kickoff_utc && !hasResult && (
          <span>{new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        )}
        {hasResult && isPens && !winner && (
          <span className="text-amber-500">Needs pen ⚠</span>
        )}
      </div>
      <div className="p-1 space-y-0.5">
        <TeamRow team={t1} score={f.home_score} isWinner={winner === t1 && t1Known} isHome />
        <TeamRow team={t2} score={f.away_score} isWinner={winner === t2 && t2Known} />
      </div>
    </div>
  )
}

// Group stage summary card
function GroupCard({ group, fixtures }) {
  const groupFs = fixtures.filter(f => f.round === 'group' && f.match_group === group)
  const played = groupFs.filter(f => f.home_score != null && f.away_score != null).length

  // Build standings from results
  const teamStats = {}
  for (const f of groupFs) {
    for (const [team, gf, ga] of [[f.home_team, f.home_score, f.away_score], [f.away_team, f.away_score, f.home_score]]) {
      if (!teamStats[team]) teamStats[team] = { pts: 0, gd: 0, gf: 0, played: 0 }
      if (f.home_score == null) continue
      teamStats[team].played++
      teamStats[team].gf += gf
      teamStats[team].gd += gf - ga
      if (gf > ga) teamStats[team].pts += 3
      else if (gf === ga) teamStats[team].pts += 1
    }
  }

  const rows = Object.entries(teamStats)
    .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden w-48 flex-shrink-0">
      <div className="bg-yellow-500/10 px-3 py-1.5 text-xs font-bold text-yellow-400 flex justify-between">
        <span>Group {group}</span>
        <span className="text-gray-500 font-normal">{played}/6</span>
      </div>
      <div className="p-1">
        {rows.map(([team, s], i) => (
          <div key={team} className={`flex items-center justify-between px-2 py-1 rounded text-xs
            ${i < 2 ? 'text-white' : 'text-gray-500'}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <FlagImg team={team} />
              <span className="truncate max-w-[80px]">{team}</span>
              {i < 2 && s.played === 3 && <span className="text-green-400 text-[10px]">✓</span>}
            </div>
            <span className={`font-bold flex-shrink-0 ${i < 2 ? 'text-yellow-400' : 'text-gray-600'}`}>{s.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TournamentBracketClient({ fixtures, masterExtras }) {
  const [view, setView] = useState('bracket') // 'bracket' | 'groups'

  const koFixtures = fixtures.filter(f => f.round !== 'group')
  const groupFixtures = fixtures.filter(f => f.round === 'group')
  const resultsEntered = fixtures.filter(f => f.home_score != null && f.away_score != null).length
  const koStarted = koFixtures.some(f => f.home_score != null)

  // Build all group tables for 3rd place ranking
  const allGroupStats = {}
  for (const g of GROUPS) {
    const teamStats = {}
    const gFixtures = groupFixtures.filter(f => f.match_group === g)
    for (const f of gFixtures) {
      for (const [team, gf, ga] of [[f.home_team, f.home_score, f.away_score], [f.away_team, f.away_score, f.home_score]]) {
        if (!teamStats[team]) teamStats[team] = { pts: 0, gd: 0, gf: 0, played: 0 }
        if (f.home_score == null) continue
        teamStats[team].played++
        teamStats[team].gf += gf
        teamStats[team].gd += gf - ga
        if (gf > ga) teamStats[team].pts += 3
        else if (gf === ga) teamStats[team].pts += 1
      }
    }
    const sorted = Object.entries(teamStats).sort(([,a],[,b]) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
    allGroupStats[g] = sorted
  }

  // 3rd place teams — the 3rd entry from each group
  const allThirds = GROUPS
    .map(g => {
      const third = allGroupStats[g]?.[2]
      return third ? { group: g, team: third[0], ...third[1] } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  // Effective top 8 — use override if set, else auto
  const overrideGroups = masterExtras?.third_place_override
    ? new Set(masterExtras.third_place_override)
    : null
  const effectiveThirds = overrideGroups
    ? [
        ...allThirds.filter(r => overrideGroups.has(r.group)),
        ...allThirds.filter(r => !overrideGroups.has(r.group)),
      ]
    : allThirds

  const roundFixtures = (round) =>
    koFixtures.filter(f => f.round === round).sort((a, b) => a.match_number - b.match_number)

  const CARD_H = 80
  const BASE_GAP = 8
  const rounds = ['R32', 'R16', 'QF', 'SF', 'FINAL']
  const bronze = koFixtures.find(f => f.round === '3RD')

  if (resultsEntered === 0) {
    return (
      <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <p className="text-gray-400 font-medium">No results yet</p>
        <p className="text-gray-600 text-sm mt-1">The tournament kicks off June 11, 2026</p>
      </div>
    )
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setView('bracket')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors
            ${view === 'bracket' ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          🏆 Bracket
        </button>
        <button onClick={() => setView('groups')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors
            ${view === 'groups' ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          📊 Group Tables
        </button>
      </div>

      {/* Group tables view */}
      {view === 'groups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GROUPS.map(g => <GroupCard key={g} group={g} fixtures={fixtures} />)}
          </div>

          {/* 3rd place ranking */}
          {allThirds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Best 3rd Place (Top 8 Advance)</h2>
                {overrideGroups && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Override active</span>
                )}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-yellow-500/5">
                      <th className="px-3 py-2 text-left text-xs text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Team</th>
                      <th className="px-2 py-2 text-center text-xs text-gray-500">Grp</th>
                      <th className="px-2 py-2 text-center text-xs text-gray-500">Pts</th>
                      <th className="px-2 py-2 text-center text-xs text-gray-500">GD</th>
                      <th className="px-2 py-2 text-center text-xs text-gray-500">GF</th>
                      <th className="px-2 py-2 text-center text-xs text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveThirds.map((row, i) => {
                      const qualifies = overrideGroups ? overrideGroups.has(row.group) : i < 8
                      const overrideChanged = overrideGroups && (
                        (overrideGroups.has(row.group) && i >= 8) ||
                        (!overrideGroups.has(row.group) && i < 8)
                      )
                      return (
                        <tr key={row.group} className={`border-b border-gray-800/50
                          ${qualifies ? overrideChanged ? 'bg-amber-500/10' : 'bg-green-500/5' : ''}`}>
                          <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-white">
                            <span className="flex items-center gap-1.5">
                              <FlagImg team={row.team} />
                              <span>{row.team}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-yellow-400 text-xs">{row.group}</td>
                          <td className="px-2 py-2 text-center text-gray-300 text-xs font-bold">{row.pts}</td>
                          <td className={`px-2 py-2 text-center text-xs ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {row.gd > 0 ? '+' : ''}{row.gd}
                          </td>
                          <td className="px-2 py-2 text-center text-gray-400 text-xs">{row.gf}</td>
                          <td className="px-2 py-2 text-center text-xs">
                            {qualifies
                              ? <span className={`font-bold ${overrideChanged ? 'text-amber-400' : 'text-green-400'}`}>
                                  {overrideChanged ? '⚠ Override' : '✓ Advances'}
                                </span>
                              : overrideChanged
                                ? <span className="text-red-400">✕ Overridden</span>
                                : <span className="text-gray-600">Eliminated</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bracket view */}
      {view === 'bracket' && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" />
              winner
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-amber-400 font-medium">(p)</span>
              won on penalties
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/15 inline-block border border-amber-500/40" />
              draw — pen winner needed
            </span>
          </div>

          {!koStarted && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-400">
              Group stage in progress — knockout bracket will populate as groups complete.
            </div>
          )}

          {/* Scrollable bracket */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 items-start min-w-max">
              {rounds.map((round, roundIdx) => {
                const fs = roundFixtures(round)
                const slotH = (CARD_H + BASE_GAP) * Math.pow(2, roundIdx)
                return (
                  <div key={round} className="flex flex-col flex-shrink-0">
                    <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 text-center w-44">
                      {ROUND_LABELS[round]}
                    </div>
                    <div className="flex flex-col">
                      {fs.map(f => (
                        <div key={f.id} style={{ height: `${slotH}px` }} className="flex items-center">
                          <MatchCard f={f} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Bronze */}
              {bronze && (
                <div className="flex flex-col flex-shrink-0 opacity-75 ml-4">
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 text-center w-44">
                    Bronze Final
                  </div>
                  <div style={{ height: `${(CARD_H + BASE_GAP) * 8}px` }} className="flex items-start pt-2">
                    <MatchCard f={bronze} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}