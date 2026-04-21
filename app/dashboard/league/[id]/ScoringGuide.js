'use client'

import { useState } from 'react'

const ROUNDS = [
  { label: 'Group Stage',    round: 'group', result: 10, score: 5,  matches: 72 },
  { label: 'Round of 32',   round: 'R32',   result: 10, score: 5,  matches: 16 },
  { label: 'Round of 16',   round: 'R16',   result: 20, score: 10, matches: 8  },
  { label: 'Quarter Finals', round: 'QF',   result: 30, score: 15, matches: 4  },
  { label: 'Semi Finals',   round: 'SF',    result: 50, score: 25, matches: 2  },
  { label: 'Bronze Final',  round: '3RD',   result: 80, score: 40, matches: 1  },
  { label: 'The Final',     round: 'FINAL', result: 80, score: 40, matches: 1  },
]

export default function ScoringGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl mb-6 overflow-hidden">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <span className="font-bold text-white">How Scoring Works</span>
        </div>
        <span className={`text-gray-500 text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-800">

          {/* Points per round table */}
          <div className="pt-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Points per match</h3>
            <div className="rounded-xl overflow-hidden border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Round</th>
                    <th className="text-center px-3 py-2.5">Correct result</th>
                    <th className="text-center px-3 py-2.5">+ Exact score</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUNDS.map((r, i) => (
                    <tr key={r.round} className={`border-t border-gray-800 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                      <td className="px-4 py-2.5 font-medium text-white">{r.label}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-yellow-400 font-bold">{r.result}</span>
                        <span className="text-gray-500 text-xs ml-1">pts</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-green-400 font-bold">+{r.score}</span>
                        <span className="text-gray-500 text-xs ml-1">pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              A correct result means getting the outcome right (win/draw/loss). An exact score gives you bonus points on top.
            </p>
          </div>

          {/* Star pick */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">⭐ Star Team — double points</h3>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3 text-sm text-gray-300">
              <p>
                Before each round kicks off, pick a <span className="text-yellow-400 font-semibold">Star Team</span>.
                Any points you earn from that team's match in that round are <span className="text-yellow-400 font-semibold">doubled</span>.
              </p>
              <p>
                You choose a star team separately for each round — group stage, R32, R16, QF, SF, and the Final.
                Your pick for each round locks when the <span className="text-white font-medium">first match of that round kicks off</span>.
              </p>
              <div className="bg-gray-900 rounded-lg p-3 text-xs space-y-1 border border-gray-800">
                <p className="text-gray-400 font-medium mb-1">Example</p>
                <p>You star pick <span className="text-white">England</span> for the Semi Finals.</p>
                <p>England win and you predicted the correct result → <span className="text-yellow-400 font-bold">50 × 2 = 100 pts</span></p>
                <p>You also got the exact score → bonus <span className="text-green-400 font-bold">+25 × 2 = 50 pts</span></p>
                <p className="text-gray-500 pt-1">Total from that match: <span className="text-white font-bold">150 pts</span></p>
              </div>
              <p className="text-gray-500 text-xs">
                High risk, high reward — if your star team loses or you get the result wrong, no points are doubled (or lost).
              </p>
            </div>
          </div>

          {/* Extras */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🎯 Tournament Extras</h3>
            <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 space-y-3 text-sm text-gray-300">
              <p>Two bonus predictions about the whole tournament. Closest answer in the league wins <span className="text-yellow-400 font-semibold">50 points</span> for each.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 text-center">
                  <div className="text-2xl mb-1">🟥</div>
                  <p className="font-medium text-white text-sm">Total Red Cards</p>
                  <p className="text-xs text-gray-500 mt-1">Across all 104 matches</p>
                  <p className="text-yellow-400 font-bold mt-2">50 pts</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 text-center">
                  <div className="text-2xl mb-1">⚽</div>
                  <p className="font-medium text-white text-sm">Total Goals</p>
                  <p className="text-xs text-gray-500 mt-1">Excl. penalty shootouts</p>
                  <p className="text-yellow-400 font-bold mt-2">50 pts</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Points scale down from 50 based on how far off you are — so an answer close to the truth still earns something.
              </p>
            </div>
          </div>

          {/* Max points summary */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Max possible points</h3>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Group stage</p>
                <p className="text-white font-bold">1,080</p>
                <p className="text-gray-600 text-xs">72 × 15pts</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Knockout</p>
                <p className="text-white font-bold">2,040</p>
                <p className="text-gray-600 text-xs">incl. star picks</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Extras</p>
                <p className="text-white font-bold">100</p>
                <p className="text-gray-600 text-xs">2 × 50pts</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}