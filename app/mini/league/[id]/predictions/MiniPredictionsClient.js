'use client'
// app/mini/league/[id]/predictions/MiniPredictionsClient.js

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { KO_ROUNDS, ROUND_LABELS, MINI_KO_POINTS, MINI_LOCK_TIME, flagUrl, shortName } from '@/lib/worldcup'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFixtureWinner(fixture) {
  if (fixture.home_score == null || fixture.away_score == null) return null
  if (fixture.penalty_winner) return fixture.penalty_winner
  if (fixture.home_score > fixture.away_score) return fixture.home_team
  if (fixture.away_score > fixture.home_score) return fixture.away_team
  return null
}

function FlagImg({ team, className = 'w-5 h-3.5' }) {
  const src = flagUrl(team)
  if (!src) return null
  return <img src={src} alt="" className={`${className} object-cover rounded-sm flex-shrink-0`} />
}

// ── Bracket Modal (winners-only, reuses main game layout) ─────────────────────

function BracketModal({ onClose, fixtures, predMap }) {
  const rounds = ['R32', 'R16', 'QF', 'SF', 'FINAL']
  const bronze = fixtures.find(f => f.round === '3RD')

  const getTeams = (f) => ({
    home: f.home_team || 'TBD',
    away: f.away_team || 'TBD',
  })

  const MatchCard = ({ f }) => {
    if (!f) return <div className="w-44 h-16 rounded-lg bg-gray-800/40 border border-gray-700/30" />
    const { home, away } = getTeams(f)
    const predicted = predMap[f.id]
    const actual    = getFixtureWinner(f)
    const isComplete = actual != null
    const isTbdHome = home === 'TBD'
    const isTbdAway = away === 'TBD'

    const TeamRow = ({ team, isTbd, isPredicted, isActualWinner, isWrong }) => (
      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded ${isPredicted && !isComplete ? 'bg-yellow-500/15' : isActualWinner ? 'bg-green-500/15' : isWrong ? '' : ''}`}>
        {!isTbd && <FlagImg team={team} className="w-4 h-3 flex-shrink-0" />}
        <span className={`text-xs truncate max-w-[90px] ${
          isTbd        ? 'text-gray-600 italic'
          : isActualWinner ? 'text-green-300 font-bold'
          : isWrong    ? 'text-gray-500'
          : isPredicted ? 'text-yellow-300 font-bold'
          : 'text-gray-300'
        }`}>
          {isTbd ? 'TBD' : team}
        </span>
        {isActualWinner && <span className="text-green-400 text-xs ml-auto">✓</span>}
        {isWrong && <span className="text-red-400 text-xs ml-auto">✗</span>}
      </div>
    )

    return (
      <div className={`w-44 bg-gray-900 border rounded-lg overflow-hidden flex-shrink-0 ${predicted ? 'border-gray-600' : 'border-gray-700/50'}`}>
        <div className="px-2 pt-1 pb-0.5 text-[10px] text-gray-600 border-b border-gray-800">
          M{f.match_number} · {MINI_KO_POINTS[f.round] ?? '?'}pts
        </div>
        <div className="p-1 space-y-0.5">
          <TeamRow
            team={home} isTbd={isTbdHome}
            isPredicted={predicted === home}
            isActualWinner={isComplete && actual === home}
            isWrong={isComplete && predicted === home && actual !== home}
          />
          <TeamRow
            team={away} isTbd={isTbdAway}
            isPredicted={predicted === away}
            isActualWinner={isComplete && actual === away}
            isWrong={isComplete && predicted === away && actual !== away}
          />
        </div>
      </div>
    )
  }

  const roundFixtures = (round) =>
    fixtures.filter(f => f.round === round).sort((a, b) => a.match_number - b.match_number)

  const CARD_H = 80
  const BASE_GAP = 8

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="font-bold text-white">🏆 My Predicted Bracket</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gold = your pick · Green = correct · Red = wrong
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
      </div>
      <div className="flex-1 overflow-auto p-6" onClick={e => e.stopPropagation()}>
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
        <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" /> your pick
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500/15 inline-block border border-green-500/30" /> correct
          </span>
          <span className="text-gray-600 italic">TBD = teams not yet confirmed</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MiniPredictionsClient({
  league, fixtures, existingPredictions, semiPicks, userId, profile, miniLeagueId,
}) {
  const now = new Date()
  const isLocked = now >= MINI_LOCK_TIME

  // Build initial prediction map: fixture_id → predicted_winner
  const [predMap, setPredMap] = useState(() => {
    const map = {}
    for (const p of existingPredictions) {
      map[p.fixture_id] = p.predicted_winner
    }
    return map
  })

  const [saveStatus, setSaveStatus] = useState('saved')
  const [toast, setToast] = useState(null)
  const [showBracket, setShowBracket] = useState(false)
  const saveTimers = useRef({})

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const savePrediction = useCallback(async (fixtureId, winner) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/mini/ko-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miniLeagueId, fixtureId, predictedWinner: winner }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || 'Save failed', 'error')
        setSaveStatus('unsaved')
      } else {
        setSaveStatus('saved')
      }
    } catch {
      showToast('Save failed', 'error')
      setSaveStatus('unsaved')
    }
  }, [miniLeagueId])

  const handlePick = (fixtureId, team, fixture) => {
    if (isLocked) return
    // If match already played, don't allow changes
    if (getFixtureWinner(fixture)) return

    setPredMap(prev => {
      // Toggle off if same team tapped again
      const next = prev[fixtureId] === team
        ? { ...prev, [fixtureId]: null }
        : { ...prev, [fixtureId]: team }

      setSaveStatus('unsaved')
      clearTimeout(saveTimers.current[fixtureId])
      saveTimers.current[fixtureId] = setTimeout(() => {
        savePrediction(fixtureId, next[fixtureId])
      }, 500)

      return next
    })
  }

  // Group fixtures by round
  const fixturesByRound = {}
  for (const round of KO_ROUNDS) {
    fixturesByRound[round] = fixtures
      .filter(f => f.round === round)
      .sort((a, b) => a.match_number - b.match_number)
  }

  const predictableFixtures = fixtures.filter(f => f.home_team && f.away_team)
  const totalPredictable = predictableFixtures.length
  const totalPredicted   = predictableFixtures.filter(f => predMap[f.id]).length
  const progressPct      = totalPredictable > 0 ? Math.round((totalPredicted / totalPredictable) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/mini/league/${miniLeagueId}`} className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {league.league_name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {totalPredicted}/{totalPredictable} picks
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saved'   ? 'bg-green-400'
              : saveStatus === 'saving' ? 'bg-yellow-400'
              : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-500">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            isLocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {isLocked ? '🔒 Locked' : '🔓 Open'}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Knockout predictions</span>
            <span>{totalPredicted}/{totalPredictable} · {progressPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Semi picks summary */}
        {semiPicks.length === 4 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-2">
              🏆 Your semi-finalist picks
            </p>
            <div className="flex flex-wrap gap-2">
              {semiPicks.map(team => (
                <span
                  key={team}
                  className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full"
                >
                  <FlagImg team={team} className="w-4 h-3" />
                  {team}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bracket button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowBracket(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg transition-colors"
          >
            🏆 View bracket
          </button>
        </div>

        {/* Rounds */}
        {KO_ROUNDS.map(round => {
          const roundFixtures = fixturesByRound[round] || []
          if (roundFixtures.length === 0) return null

          const roundPts = MINI_KO_POINTS[round]
          const allTbd = roundFixtures.every(f => !f.home_team && !f.away_team)
          if (allTbd) return null

          return (
            <div key={round} className="mb-8">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                  {ROUND_LABELS[round]}
                </span>
                <span className="text-xs text-gray-500">{roundPts} pts per correct pick</span>
              </div>

              <div className="space-y-3">
                {roundFixtures.map(f => {
                  const homeTeam    = f.home_team
                  const awayTeam    = f.away_team
                  const isTbd       = !homeTeam || !awayTeam
                  const actualWinner = getFixtureWinner(f)
                  const isComplete  = actualWinner != null
                  const predicted   = predMap[f.id]
                  const isCorrect   = isComplete && predicted && predicted === actualWinner
                  const isWrong     = isComplete && predicted && predicted !== actualWinner
                  const canPredict  = !isLocked && !isComplete && !isTbd

                  if (isTbd) {
                    return (
                      <div
                        key={f.id}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-2"
                      >
                        <span className="text-gray-600 text-xs">🔒</span>
                        <span className="text-gray-600 text-xs italic">
                          Teams to be confirmed (Match {f.match_number})
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={f.id}
                      className={`bg-gray-900 border rounded-xl p-3 transition-colors ${
                        isCorrect ? 'border-green-500/40'
                        : isWrong  ? 'border-gray-800'
                        : predicted ? 'border-yellow-500/40'
                        : 'border-gray-800'
                      }`}
                    >
                      {/* Match number + date */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Match {f.match_number}</span>
                        {f.kickoff_utc && (
                          <span className="text-xs text-gray-600">
                            {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      {/* Team buttons */}
                      <div className="flex items-center gap-2">
                        {/* Home team */}
                        <button
                          onClick={() => handlePick(f.id, homeTeam, f)}
                          disabled={!canPredict}
                          className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors
                            ${!canPredict ? 'cursor-default' : 'cursor-pointer'}
                            ${predicted === homeTeam && !isComplete
                              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 font-medium'
                              : isComplete && actualWinner === homeTeam
                                ? 'bg-green-500/15 border-green-500/40 text-green-300 font-medium'
                                : isComplete && predicted === homeTeam && actualWinner !== homeTeam
                                  ? 'bg-gray-800 border-gray-700 text-gray-500'
                                  : isComplete
                                    ? 'bg-gray-900 border-gray-800 text-gray-500'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40 hover:text-white'
                            }
                          `}
                        >
                          <FlagImg team={homeTeam} />
                          <span className="hidden sm:inline truncate">{homeTeam}</span>
                          <span className="sm:hidden truncate text-xs">{shortName(homeTeam)}</span>
                          {isComplete && actualWinner === homeTeam && <span className="ml-auto text-green-400 text-xs">✓</span>}
                          {isComplete && predicted === homeTeam && actualWinner !== homeTeam && <span className="ml-auto text-red-400 text-xs">✗</span>}
                        </button>

                        <span className="text-gray-600 text-xs flex-shrink-0">vs</span>

                        {/* Away team */}
                        <button
                          onClick={() => handlePick(f.id, awayTeam, f)}
                          disabled={!canPredict}
                          className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors
                            ${!canPredict ? 'cursor-default' : 'cursor-pointer'}
                            ${predicted === awayTeam && !isComplete
                              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 font-medium'
                              : isComplete && actualWinner === awayTeam
                                ? 'bg-green-500/15 border-green-500/40 text-green-300 font-medium'
                                : isComplete && predicted === awayTeam && actualWinner !== awayTeam
                                  ? 'bg-gray-800 border-gray-700 text-gray-500'
                                  : isComplete
                                    ? 'bg-gray-900 border-gray-800 text-gray-500'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40 hover:text-white'
                            }
                          `}
                        >
                          <FlagImg team={awayTeam} />
                          <span className="hidden sm:inline truncate">{awayTeam}</span>
                          <span className="sm:hidden truncate text-xs">{shortName(awayTeam)}</span>
                          {isComplete && actualWinner === awayTeam && <span className="ml-auto text-green-400 text-xs">✓</span>}
                          {isComplete && predicted === awayTeam && actualWinner !== awayTeam && <span className="ml-auto text-red-400 text-xs">✗</span>}
                        </button>
                      </div>

                      {/* Result / no prediction note */}
                      {isComplete && (
                        <div className={`mt-2 text-xs text-center ${
                          isCorrect ? 'text-green-400' : isWrong ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {isCorrect && `✓ Correct — ${actualWinner} won · +${roundPts} pts`}
                          {isWrong  && `✗ ${actualWinner} won · +0 pts`}
                          {!predicted && `No prediction made · ${actualWinner} won`}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

      </div>

      {/* Bracket modal */}
      {showBracket && (
        <BracketModal
          onClose={() => setShowBracket(false)}
          fixtures={fixtures}
          predMap={predMap}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50 ${
          toast.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}