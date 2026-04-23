'use client'

import { useState } from 'react'
import Link from 'next/link'

const FAQS = [
  {
    category: 'Scoring',
    items: [
      {
        q: 'How does scoring work?',
        a: `For every match you predict, you earn points based on how accurate your prediction is:

• **Correct result** (win/draw/loss): base points for that round
• **Correct score** (exact scoreline): base points + bonus points

Points scale up in the knockout rounds:

| Round | Result | + Exact Score |
|-------|--------|---------------|
| Group / R32 | 10 pts | +5 pts |
| Round of 16 | 20 pts | +10 pts |
| Quarter-Finals | 30 pts | +15 pts |
| Semi-Finals | 50 pts | +25 pts |
| Bronze / Final | 80 pts | +40 pts |

For knockout matches that go to penalties, a correct result prediction means you predicted the same team to win (regardless of the score you entered).`
      },
      {
        q: 'What is a Star Pick and how does it work?',
        a: `For each round of the tournament you can nominate one team as your Star Pick. If that team plays in a match during that round and you score points for that match, your points are doubled.

You set a different Star Pick for each round — group stage, Round of 32, Round of 16, Quarter-Finals, Semi-Finals, and the Final.

Your Star Pick is private — other players cannot see which team you have chosen. Choose wisely!

To set your Star Pick, go to your **Predictions** page and scroll to the relevant round section. You'll see a star picker above the fixtures for that round.`
      },
      {
        q: 'What are the Extras predictions?',
        a: `On the Predictions page you'll find two bonus predictions at the bottom:

• **Total goals** — your prediction for the total number of goals scored across all 104 matches of the tournament. You earn up to 50 pts, losing 2 pts for every goal you are off by.

• **Total red cards** — your prediction for total red cards shown in the tournament. You earn up to 50 pts, losing 5 pts for every red card you are off by.

In both cases, the closer you are, the more you earn. An exact prediction earns the full 50 pts.`
      },
    ]
  },
  {
    category: 'Predictions',
    items: [
      {
        q: 'When is the deadline to enter predictions?',
        a: `The tournament begins on **11 June 2026**. You should aim to have all your group stage predictions in before then.

For knockout stage predictions, you can enter them any time before the relevant round starts. However we recommend entering all predictions early — it's more fun to have everything locked in before the tournament begins.`
      },
      {
        q: 'Can I change my predictions after submitting?',
        a: `Yes — predictions are saved automatically as you enter them and you can change them at any time before the relevant match kicks off. Once a match has started, predictions for that match are locked.`
      },
      {
        q: 'Where do I enter my Star Pick?',
        a: `Go to your **Predictions** page (tap the "Make Predictions" button on your league homepage).

Your Star Pick is shown at the top of each round section — Group Stage, Round of 32, Round of 16, Quarter-Finals, Semi-Finals, and the Final. Tap **"Star pick"** next to the round you want to set, choose your team from the list, and it saves automatically.`
      },
      {
        q: 'Do I need to predict every match?',
        a: `No — you can predict as many or as few matches as you like. You simply won't earn points for matches you haven't predicted. That said, the more you predict, the more chances you have to score points!`
      },
    ]
  },
  {
    category: 'Tournament Format',
    items: [
      {
        q: 'What happens if teams are level on points in a group?',
        a: `If two or more teams finish level on points, the following tiebreakers are applied in order:

1. Goal difference
2. Goals scored
3. Head-to-head record between the tied teams
4. Fair play score (yellow/red cards)
5. FIFA world ranking

In very rare cases where all tiebreakers are equal, FIFA may draw lots. If this happens and the auto-computed standings are incorrect, the league admin can manually set the correct group order.`
      },
      {
        q: 'How are the best 8 third-placed teams decided?',
        a: `After all group stage matches are played, all 12 third-placed teams are ranked against each other using the same tiebreakers: points, then goal difference, then goals scored.

The top 8 third-placed teams advance to the Round of 32. Which specific R32 fixture each third-placed team enters is determined by FIFA's official Annex C draw table, which depends on which 8 groups the qualifying third-placed teams came from.

The tournament bracket in the app updates automatically once all group results are in.`
      },
      {
        q: 'What happens in a knockout match that ends in a draw?',
        a: `In the knockout stage, you cannot predict a draw — the predictions page will not allow equal scores for knockout matches.

If a knockout match ends level after 90 minutes and extra time, it goes to a penalty shootout. For scoring purposes, the penalty winner effectively gets +1 added to their score. So, for example, a match that finishes France 2–2 Germany after extra time with Germany winning on penalties is treated as a **France 2–3 Germany win** for comparison against your prediction.

This means to score exact score bonus points in that scenario, you would need to have predicted **France 2–3 Germany** (not 2–2, and not any other scoreline).

The app displays penalty shootout results with a **(p)** indicator in the bracket.`
      },
    ]
  },
  {
    category: 'Leagues',
    items: [
      {
        q: 'How do I invite someone to my league?',
        a: `From your league homepage, tap the **Invite** button to get your league's unique join code or shareable link. Send that to anyone you want to invite — they just need to create an account and enter the code on the Join League page.`
      },
      {
        q: 'Can I be in more than one league?',
        a: `Yes! You can join as many leagues as you like. Your predictions are shared across all leagues — you only need to enter them once, and your score will appear in every league you're a member of.

This means you can't have different predictions for different leagues, but it keeps things simple — no need to fill in hundreds of predictions multiple times.`
      },
      {
        q: 'Who can see my predictions?',
        a: `Your predicted scorelines are private — no other player can see them. The standings page only shows each player's total points, not the actual scores they predicted.

Your **Star Pick** is also always private — no one else can see which team you have nominated for any round.`
      },
    ]
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)

  // Render simple markdown-like formatting
  const renderAnswer = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('| ')) {
        // Skip table rows in simple rendering — just show as preformatted
        return null
      }
      if (line.startsWith('• ')) {
        return (
          <li key={i} className="flex gap-2 items-start">
            <span className="text-yellow-400 mt-0.5 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
          </li>
        )
      }
      if (line.trim() === '') return <div key={i} className="h-2" />
      return (
        <p key={i} className="leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
      )
    }).filter(Boolean)
  }

  // Build scoring table separately
  const hasTable = a.includes('| Round |')
  const tableRows = [
    ['Group / R32', '10 pts', '+5 pts'],
    ['Round of 16', '20 pts', '+10 pts'],
    ['Quarter-Finals', '30 pts', '+15 pts'],
    ['Semi-Finals', '50 pts', '+25 pts'],
    ['Bronze / Final', '80 pts', '+40 pts'],
  ]

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/40 transition-colors"
      >
        <span className="font-medium text-sm text-white pr-4">{q}</span>
        <span className={`text-yellow-400 text-lg flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-400 space-y-1 border-t border-gray-800 pt-4">
          {hasTable ? (
            <>
              {a.split('\n').filter(l => !l.startsWith('|') && !l.startsWith('•')).map((line, i) => (
                line.trim() ? (
                  <p key={i} className="leading-relaxed mb-2"
                    dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                ) : null
              ))}
              <ul className="space-y-1 my-2">
                {a.split('\n').filter(l => l.startsWith('• ')).map((line, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </li>
                ))}
              </ul>
              <div className="rounded-lg overflow-hidden border border-gray-700 mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-yellow-500/10 border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-yellow-400">Round</th>
                      <th className="px-3 py-2 text-center text-gray-400">Result</th>
                      <th className="px-3 py-2 text-center text-gray-400">+ Exact Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(([round, result, bonus], i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-3 py-2 text-white font-medium">{round}</td>
                        <td className="px-3 py-2 text-center text-green-400">{result}</td>
                        <td className="px-3 py-2 text-center text-blue-400">{bonus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 leading-relaxed text-gray-400">For knockout matches that go to penalties, a correct result prediction means you predicted the same team to win (regardless of the score you entered).</p>
            </>
          ) : (
            <div className="space-y-1">
              {a.split('\n').map((line, i) => {
                if (line.startsWith('• ')) {
                  return (
                    <li key={i} className="flex gap-2 items-start list-none">
                      <span className="text-yellow-400 mt-0.5 flex-shrink-0">•</span>
                      <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    </li>
                  )
                }
                if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ')) {
                  const num = line.split('.')[0]
                  const text = line.slice(num.length + 2)
                  return (
                    <li key={i} className="flex gap-2 items-start list-none">
                      <span className="text-yellow-400 font-bold flex-shrink-0 w-4">{num}.</span>
                      <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    </li>
                  )
                }
                if (line.trim() === '') return <div key={i} className="h-1.5" />
                return (
                  <p key={i} className="leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-xs text-gray-500">Help & FAQs</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 text-xl">?</div>
            <h1 className="text-2xl font-bold">Help & FAQs</h1>
          </div>
          <p className="text-gray-500 text-sm">Everything you need to know about playing World Cup Predictor 2026.</p>
        </div>

        <div className="space-y-8">
          {FAQS.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3 px-1">{category}</h2>
              <div className="space-y-2">
                {items.map(({ q, a }) => (
                  <FAQItem key={q} q={q} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-500 text-center">
          Still stuck? Ask your league admin or{' '}
          <a href="mailto:support@worldcuppredictor.app" className="text-yellow-400 hover:underline">get in touch</a>.
        </div>
      </div>
    </main>
  )
}