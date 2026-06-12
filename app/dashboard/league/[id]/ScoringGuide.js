'use client'

import { useState } from 'react'

const ROUNDS = [
  { label: 'Group Stage',            round: 'group', result: 10, score: 5  },
  { label: 'Round of 32',            round: 'R32',   result: 10, score: 5  },
  { label: 'Round of 16',            round: 'R16',   result: 20, score: 10 },
  { label: 'Quarter-Finals / Semis', round: 'QF',    result: 30, score: 15 },
  { label: 'Bronze Final / Final',   round: 'FINAL', result: 50, score: 25 },
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
        <div className="px-6 pb-6 space-y-6 border-t border-gray-800 pt-5">

          {/* Group stage */}
          <div>
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">Group Stage</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Predict the scoreline for each of the 48 group matches. For each match you earn:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              <li className="flex gap-2 items-start">
                <span className="text-green-400 flex-shrink-0 mt-0.5">•</span>
                <span><strong className="text-white">Correct result</strong> (win / draw / loss) — base points</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                <span><strong className="text-white">Correct exact score</strong> — base points + bonus points</span>
              </li>
            </ul>
          </div>

          {/* Knockout rounds */}
          <div>
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">Knockout Rounds</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Knockout scoring is <strong className="text-white">team-centric</strong>. For each real knockout result, the app evaluates both teams independently:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-400">
              <li className="flex gap-2 items-start">
                <span className="text-yellow-400 flex-shrink-0 mt-0.5">•</span>
                <span>Did you predict this team to reach this round? If yes — did you call the right outcome (advance or exit)? You earn points regardless of who their opponent actually was.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-yellow-400 flex-shrink-0 mt-0.5">•</span>
                <span>
                  <strong className="text-white">Exact score bonus</strong> is compared from each team's own perspective (their goals for and against). Example: you predict Australia to lose 1–3. In the actual tournament Australia lose 1–3 to France — a different opponent. You still earn the exact score bonus.
                </span>
              </li>
            </ul>
          </div>

          {/* Points per round table */}
          <div>
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
          </div>

          {/* Penalties note */}
          <p className="text-xs text-gray-500 leading-relaxed">
            For penalty shootouts, the winning team gets +1 added to their score for exact score comparison purposes. A match finishing 2–2 aet with Germany winning on penalties is treated as a <strong className="text-gray-300">2–3 Germany win</strong>.
          </p>

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
                <p>England win and you predicted the correct result → <span className="text-yellow-400 font-bold">30 × 2 = 60 pts</span></p>
                <p>You also got the exact score → bonus <span className="text-green-400 font-bold">+15 × 2 = 30 pts</span></p>
                <p className="text-gray-500 pt-1">Total from that match: <span className="text-white font-bold">90 pts</span></p>
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

        </div>
      )}
    </div>
  )
}