'use client'
// app/mini/league/[id]/predictions/MiniPredictionsClient.js

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { KO_ROUNDS, ROUND_LABELS, MINI_KO_POINTS, flagUrl, shortName } from '@/lib/worldcup'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFixtureWinner(fixture) {
  if (fixture.home_score == null || fixture.away_score == null) return null
  if (fixture.penalty_winner) return fixture.penalty_winner
  if (fixture.home_score > fixture.away_score) return fixture.home_team
  if (fixture.away_score > fixture.home_score) return fixture.away_team
  return null
}

function hasKickedOff(fixture) {
  if (!fixture.kickoff_utc) return false
  return new Date() >= new Date(fixture.kickoff_utc)
}

function FlagImg({ team, className = 'w-5 h-3.5' }) {
  const src = flagUrl(team)
  if (!src) return null
  return <img src={src} alt="" className={`${className} object-cover rounded-sm flex-shrink-0`} />
}


// ── Two-segment OddsPie (home win / away win only — no draw in KO) ────────────

function OddsPie2({ homePct, drawPct, awayPct, homeTeam, awayTeam }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 178, H = 178, cx = 89, cy = 89, R = 86
    const probs = [homePct / 100, drawPct / 100, awayPct / 100]
    const light = ['#4a90d9', '#aaaaaa', '#e05555']
    const dark  = ['#0a3d7a', '#3a3a3a', '#7a0f0f']
    const off = document.createElement('canvas')
    off.width = W; off.height = H
    const o = off.getContext('2d')
    o.fillStyle = '#fff'
    o.beginPath(); o.arc(cx, cy, R, 0, Math.PI * 2); o.fill()
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
      pentagon(o, cx + 40 * Math.cos(a), cy + 40 * Math.sin(a), 15, a + Math.PI / 5); o.fill()
    }
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i + 0.5) * Math.PI * 2 / 5
      pentagon(o, cx + 70 * Math.cos(a), cy + 70 * Math.sin(a), 12, a); o.fill()
    }
    const fd = o.getImageData(0, 0, W, H).data
    const angles = []
    let cum = -Math.PI / 2
    for (const p of probs) { angles.push(cum); cum += p * Math.PI * 2 }
    angles.push(cum)
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
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5
    for (let s = 0; s < probs.length; s++) {
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + R * Math.cos(angles[s]), cy + R * Math.sin(angles[s])); ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke()
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
      <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wider font-bold">Match outcome probability</p>
      <canvas ref={canvasRef} width={178} height={178} className="w-full h-auto" />
      <div className="flex justify-between mt-3 text-xs">
        <span className="text-blue-400 font-bold truncate max-w-[38%]">{homeTeam}</span>
        <span className="text-gray-400 font-bold flex-shrink-0 mx-1">Pens</span>
        <span className="text-red-400 font-bold truncate max-w-[38%] text-right">{awayTeam}</span>
      </div>
      <p className="text-[10px] text-gray-600 text-center mt-2">Derived from bookmaker odds · updated daily</p>
    </div>
  )
}

function OddsPopover2({ rect, odds, homeTeam, awayTeam, onClose }) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  if (!rect) return null
  const homePct = Math.round(odds.home_prob ?? 0)
  const drawPct = Math.round(odds.draw_prob ?? 0)
  const awayPct = 100 - homePct - drawPct
  const popoverH = 300
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow > popoverH ? rect.bottom + 6 : rect.top - popoverH - 6
  const right = window.innerWidth - rect.right
  return createPortal(
    <div style={{ position: 'fixed', top, right, zIndex: 9999 }} onMouseDown={e => e.stopPropagation()}>
      <OddsPie2
        homePct={homePct}
        drawPct={drawPct}
        awayPct={awayPct}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>,
    document.body
  )
}

// ── Bracket Modal ─────────────────────────────────────────────────────────────

function BracketModal({ onClose, fixtures, predMap }) {
  const rounds = ['R32', 'R16', 'QF', 'SF', 'FINAL']
  const bronze = fixtures.find(f => f.round === '3RD')

  const MatchCard = ({ f }) => {
    if (!f) return <div className="w-44 h-16 rounded-lg bg-gray-800/40 border border-gray-700/30" />
    const home = f.home_team || 'TBD'
    const away = f.away_team || 'TBD'
    const predicted   = predMap[f.id]
    const actual      = getFixtureWinner(f)
    const isComplete  = actual != null
    const isTbdHome   = home === 'TBD'
    const isTbdAway   = away === 'TBD'

    const TeamRow = ({ team, isTbd, isPredicted, isActualWinner, isWrong }) => (
      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded ${isPredicted && !isComplete ? 'bg-yellow-500/15' : isActualWinner ? 'bg-green-500/15' : ''}`}>
        {!isTbd && <FlagImg team={team} className="w-4 h-3 flex-shrink-0" />}
        <span className={`text-xs truncate max-w-[90px] ${
          isTbd ? 'text-gray-600 italic'
          : isActualWinner ? 'text-green-300 font-bold'
          : isWrong ? 'text-gray-500'
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
          <TeamRow team={home} isTbd={isTbdHome} isPredicted={predicted === home} isActualWinner={isComplete && actual === home} isWrong={isComplete && predicted === home && actual !== home} />
          <TeamRow team={away} isTbd={isTbdAway} isPredicted={predicted === away} isActualWinner={isComplete && actual === away} isWrong={isComplete && predicted === away && actual !== away} />
        </div>
      </div>
    )
  }

  const R32_DISPLAY_ORDER = [74,77, 73,75, 83,84, 81,82, 76,78, 79,80, 86,88, 85,87]
  const R16_DISPLAY_ORDER = [89,90, 93,94, 91,92, 95,96]

  const roundFixtures = (round) => {
    const fs = fixtures.filter(f => f.round === round)
    if (round === 'R32') return R32_DISPLAY_ORDER.map(n => fs.find(f => f.match_number === n)).filter(Boolean)
    if (round === 'R16') return R16_DISPLAY_ORDER.map(n => fs.find(f => f.match_number === n)).filter(Boolean)
    return fs.sort((a, b) => a.match_number - b.match_number)
  }

  const CARD_H = 80
  const BASE_GAP = 8

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-bold text-white">🏆 My Predicted Bracket</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gold = your pick · Green = correct · Red = wrong</p>
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
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 text-center w-44">Bronze Final</div>
              <div style={{ height: `${(CARD_H + BASE_GAP) * 8}px` }} className="flex items-start pt-2">
                <MatchCard f={bronze} />
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" /> your pick</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block border border-green-500/30" /> correct</span>
          <span className="text-gray-600 italic">TBD = teams not yet confirmed</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MiniPredictionsClient({
  league, fixtures, existingPredictions, semiPicks, userId, profile, miniLeagueId,
  fixtureOdds = {},
}) {
  // Build initial prediction map: fixture_id → predicted_winner
  const [predMap, setPredMap] = useState(() => {
    const map = {}
    for (const p of existingPredictions) map[p.fixture_id] = p.predicted_winner
    return map
  })

  const [saveStatus, setSaveStatus] = useState('saved')
  const [toast, setToast] = useState(null)
  const [showBracket, setShowBracket] = useState(false)
  const [oddsOpen, setOddsOpen] = useState(null)
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
    // Double-check client-side — server will also enforce this
    if (hasKickedOff(fixture) || getFixtureWinner(fixture)) return

    setPredMap(prev => {
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

  const predictableFixtures = fixtures.filter(f => f.home_team && f.away_team && !hasKickedOff(f) && !getFixtureWinner(f))
  const totalPredictable   = fixtures.filter(f => f.home_team && f.away_team).length
  const totalPredicted     = fixtures.filter(f => f.home_team && f.away_team && predMap[f.id]).length
  const progressPct        = totalPredictable > 0 ? Math.round((totalPredicted / totalPredictable) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/mini/league/${miniLeagueId}`} className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {league.league_name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{totalPredicted}/{totalPredictable} picks</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saved' ? 'bg-green-400'
              : saveStatus === 'saving' ? 'bg-yellow-400'
              : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-500">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
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
            <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Semi picks summary */}
        {semiPicks.length === 4 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-2">🏆 Your semi-finalist picks</p>
            <div className="flex flex-wrap gap-2">
              {semiPicks.map(team => (
                <span key={team} className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full">
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
                  const homeTeam     = f.home_team
                  const awayTeam     = f.away_team
                  const isTbd        = !homeTeam || !awayTeam
                  const actualWinner = getFixtureWinner(f)
                  const isComplete   = actualWinner != null
                  const kicked       = hasKickedOff(f)
                  const predicted    = predMap[f.id]
                  const isCorrect    = isComplete && predicted && predicted === actualWinner
                  const isWrong      = isComplete && predicted && predicted !== actualWinner
                  // Can predict: teams known, not kicked off yet, not already finished
                  const canPredict   = !isTbd && !kicked && !isComplete

                  if (isTbd) {
                    return (
                      <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-2">
                        <span className="text-gray-600 text-xs">🔒</span>
                        <span className="text-gray-600 text-xs italic">
                          Teams to be confirmed (Match {f.match_number})
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div key={f.id} className={`bg-gray-900 border rounded-xl p-3 transition-colors ${
                      isCorrect ? 'border-green-500/40'
                      : isWrong ? 'border-gray-800'
                      : predicted ? 'border-yellow-500/40'
                      : 'border-gray-800'
                    }`}>
                      {/* Match info */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Match {f.match_number}</span>
                        <div className="flex items-center gap-2">
                          {kicked && !isComplete && (
                            <span className="text-xs text-orange-400">🔒 In progress</span>
                          )}
                          {kicked && isComplete && (
                            <span className="text-xs text-gray-600">Full time</span>
                          )}
                          {!kicked && f.kickoff_utc && (
                            <span className="text-xs text-gray-600">
                              {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {' · '}
                              {new Date(f.kickoff_utc).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UK
                            </span>
                          )}
                          {fixtureOdds[f.id] && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (oddsOpen?.fixtureId === f.id) { setOddsOpen(null); return }
                                const rect = e.currentTarget.getBoundingClientRect()
                                setOddsOpen({ fixtureId: f.id, rect, odds: fixtureOdds[f.id], homeTeam: f.home_team, awayTeam: f.away_team })
                              }}
                              className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 rounded border transition-colors flex-shrink-0
                                ${oddsOpen?.fixtureId === f.id ? 'border-gray-500 text-gray-300 bg-gray-800' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                            >
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <rect x="0" y="5" width="3" height="7" rx="1" fill="currentColor"/>
                                <rect x="4" y="3" width="3" height="9" rx="1" fill="currentColor"/>
                                <rect x="8" y="0.5" width="3" height="11.5" rx="1" fill="currentColor"/>
                              </svg>
                              %
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Team buttons */}
                      <div className="flex items-center gap-2">
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
                                  : isComplete || kicked
                                    ? 'bg-gray-900 border-gray-800 text-gray-500'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40 hover:text-white'
                            }`}
                        >
                          <FlagImg team={homeTeam} />
                          <span className="hidden sm:inline truncate">{homeTeam}</span>
                          <span className="sm:hidden truncate text-xs">{shortName(homeTeam)}</span>
                          {isComplete && actualWinner === homeTeam && <span className="ml-auto text-green-400 text-xs">✓</span>}
                          {isComplete && predicted === homeTeam && actualWinner !== homeTeam && <span className="ml-auto text-red-400 text-xs">✗</span>}
                        </button>

                        <span className="text-gray-600 text-xs flex-shrink-0">vs</span>

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
                                  : isComplete || kicked
                                    ? 'bg-gray-900 border-gray-800 text-gray-500'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40 hover:text-white'
                            }`}
                        >
                          <FlagImg team={awayTeam} />
                          <span className="hidden sm:inline truncate">{awayTeam}</span>
                          <span className="sm:hidden truncate text-xs">{shortName(awayTeam)}</span>
                          {isComplete && actualWinner === awayTeam && <span className="ml-auto text-green-400 text-xs">✓</span>}
                          {isComplete && predicted === awayTeam && actualWinner !== awayTeam && <span className="ml-auto text-red-400 text-xs">✗</span>}
                        </button>
                      </div>

                      {/* Result note */}
                      {isComplete && (
                        <div className={`mt-2 text-xs text-center ${isCorrect ? 'text-green-400' : isWrong ? 'text-red-400' : 'text-gray-500'}`}>
                          {isCorrect && `✓ Correct — ${actualWinner} won · +${roundPts} pts`}
                          {isWrong   && `✗ ${actualWinner} won · +0 pts`}
                          {!predicted && `No prediction made · ${actualWinner} won`}
                        </div>
                      )}

                      {/* Kicked off but not complete — no prediction */}
                      {kicked && !isComplete && !predicted && (
                        <div className="mt-2 text-xs text-center text-orange-400/70">
                          Match in progress — predictions closed
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

      {/* Odds popover */}
      {oddsOpen && (
        <OddsPopover2
          rect={oddsOpen.rect}
          odds={oddsOpen.odds}
          homeTeam={oddsOpen.homeTeam}
          awayTeam={oddsOpen.awayTeam}
          onClose={() => setOddsOpen(null)}
        />
      )}

      {/* Bracket modal */}
      {showBracket && (
        <BracketModal onClose={() => setShowBracket(false)} fixtures={fixtures} predMap={predMap} />
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