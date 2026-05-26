'use client'

import { useState } from 'react'
import Link from 'next/link'

const SCORING_ROWS = [
  { round: 'Group Stage',            result: '10 pts', exact: '+5 pts'  },
  { round: 'Round of 32',            result: '10 pts', exact: '+5 pts'  },
  { round: 'Round of 16',            result: '20 pts', exact: '+10 pts' },
  { round: 'Quarter-Finals / Semis', result: '30 pts', exact: '+15 pts' },
  { round: 'Bronze Final / Final',   result: '50 pts', exact: '+25 pts' },
]

const FAQS = [
  {
    category: 'Scoring',
    items: [
      {
        q: 'How does scoring work?',
        type: 'scoring',
      },
      {
        q: 'Why did I score points even though my predicted opponent was different?',
        a: `In the knockout rounds, scoring is team-centric — the app evaluates each team's result independently, not each fixture as a whole.

When a knockout match is played, the app looks at both teams separately and asks: did you predict this team to reach this round, and did you predict the right outcome for them? If yes, you earn points — regardless of who their opponent actually was.

This is by design. In the Round of 32, 8 of the 32 fixtures involve third-placed group teams whose placement is determined by a FIFA draw with 495 possible combinations. Scoring only on exact fixture match-ups would mean nearly everyone scores zero on those matches through no fault of their own. The team-centric model rewards your football knowledge — correctly calling which teams advance and which exit — rather than luck of the draw.`
      },
      {
        q: 'What is a Star Pick and how does it work?',
        a: `For each round of the tournament you can nominate one team as your Star Pick. If that team plays in a match during that round and you score points for that match, your points are doubled.

You set a different Star Pick for each round — Group Stage, Round of 32, Round of 16, Quarter-Finals, Semi-Finals, and the Final. The Bronze Final uses the same Star Pick as the Final.

Unlike match score predictions, Star Picks have **rolling deadlines** — each round's Star Pick locks when the first match of that round kicks off. So your Group Stage Star Pick must be set before 11 June, but you have until the first Round of 32 match (late June) to set that pick, and so on through the tournament. This means you can watch the group stage unfold and pick the team that looks sharpest before committing.

Your Star Pick is private — other players cannot see which team you have chosen. Choose wisely!

To set or change your Star Pick, go to your Predictions page and tap "Star pick" at the top of each round section.`
      },
      {
        q: 'What are the Extras predictions?',
        a: `On the Predictions page you'll find two bonus predictions at the bottom:

• **Total goals** — your prediction for the total number of goals scored across all 104 matches of the tournament. You earn up to 50 pts. Points scale down the further off you are, but your score will never go below zero — the minimum you can earn is 0 pts.

• **Total red cards** — your prediction for total red cards shown in the tournament. Same scoring — up to 50 pts, minimum 0 pts.

In both cases, the closer you are, the more you earn. An exact prediction earns the full 50 pts.`
      },
    ]
  },
  {
    category: 'Plans & Pricing',
    items: [
      {
        q: 'What plans are available and what do they cost?',
        a: `There are four plans for a league:

• **Hobby** — free. Up to 6 members (admin + 5). Perfect for a small group of friends.

• **Enthusiast** — £12 one-time. Up to 11 members (admin + 10).

• **Fanatic** — £20 one-time. Unlimited members.

• **Business** — £100 one-time. Unlimited members, designed for pubs and workplaces. Includes a QR code table card for easy joining.

All plans are a one-time payment — there are no subscriptions or recurring charges.`
      },
      {
        q: 'How do I upgrade my league?',
        a: `Only the league admin can upgrade. Go to your league page and tap **⚙️ League Admin**, then scroll to the **League Plan** section. You'll see your current tier and the available upgrade options. Tap the upgrade you want and you'll be taken to a secure checkout. Your league is upgraded instantly once payment is confirmed.`
      },
      {
        q: 'What happens when my league is full?',
        a: `When your league reaches its member limit, anyone who tries to join using your invite link will be blocked and shown a message explaining the league is full. You'll also receive an email letting you know someone tried to join.

To let them in, upgrade your league to the next tier — this takes effect immediately and they can rejoin straight away.`
      },
      {
        q: 'Can I get a refund?',
        a: `Upgrades take effect immediately, so we don't offer refunds as a general rule. If your payment was taken but your league wasn't upgraded, contact us at support@thematchpredictor.com and we'll resolve it promptly. Payments are processed securely by Lemon Squeezy.`
      },
    ]
  },
  {
    category: 'Predictions',
    items: [
      {
        q: 'When is the deadline to enter predictions?',
        a: `All predictions — group stage and knockout stage — must be entered before the tournament begins on **11 June 2026**. Once the first match kicks off, the predictions page locks and no further score predictions can be made.

We recommend getting everything in well before then. It's much more fun to have your full bracket locked in before a ball is kicked.`
      },
      {
        q: 'Can I change my predictions after submitting?',
        a: `Yes — predictions are saved automatically as you enter them and you can change them at any time before the tournament begins on **11 June 2026**. Once the first match kicks off, all predictions lock and cannot be changed.`
      },
      {
        q: 'Can I change my knockout stage predictions?',
        a: `Yes — you can overwrite your knockout predictions at any time before the tournament begins on **11 June 2026**. Simply go to your Predictions page, navigate to the knockout round, and enter new scores. Your latest entry is always saved automatically.`
      },
      {
        q: 'Where do I enter my Star Pick?',
        a: `Go to your **Predictions** page (tap the "Make Predictions" button on your league homepage).

Your Star Pick is shown at the top of each round section — Group Stage, Round of 32, Round of 16, Quarter-Finals, Semi-Finals, and the Final. Tap **"Star pick"** next to the round you want to set, choose your team from the list, and it saves automatically.`
      },
      {
        q: 'What is the chart icon next to some matches?',
        a: `The chart icon shows the current implied probability for each outcome — home win, draw, and away win — derived from bookmaker betting odds.

These probabilities are displayed as a football-shaped pie chart. They are updated daily and may not be available for all matches, particularly those a long time in the future.

Do not feel tied to these when making your predictions! They reflect the market's view, not necessarily what will happen. Picking against the odds is often where the biggest points are won.`
      },
      {
        q: 'Do I need to predict every match?',
        a: `No — you can predict as many or as few matches as you like. You simply won't earn points for matches you haven't predicted. That said, the more you predict, the more chances you have to score points!`
      },
      {
        q: 'Can I delete all my predictions and start again?',
        a: `Yes — as long as the tournament hasn't started yet. On your Predictions page, scroll to the top of the match list and tap **🗑 Start again**. You'll be asked to confirm before anything is deleted.

This removes all your predicted scores, extras (red cards and total goals), and star picks for that league. It cannot be undone, so make sure you want a clean slate before confirming.

Once the tournament begins on **11 June 2026**, predictions are locked and cannot be cleared.`
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

If a knockout match ends level after 90 minutes and extra time, it goes to a penalty shootout. For scoring purposes, the penalty winner effectively gets +1 added to their score. So, for example, a match that finishes France 2–2 Germany after extra time with Germany winning on penalties is treated as a **2–3 Germany win** for comparison against your prediction.

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
        a: `Yes! You can join as many leagues as you like. Your predictions are entered separately for each league — if you are in multiple leagues you will need to enter your predictions in each one. This means you could theoretically make different predictions in different leagues.

If you haven't yet entered any predictions in a particular league, you'll have the option to import your predictions from another league you've already completed — saving you from having to enter everything twice.`
      },
      {
        q: 'Who can see my predictions?',
        a: `Your predicted scorelines are private until the tournament begins. Once predictions are locked on **11 June 2026**, other members of your league can view your predicted knockout bracket by tapping your name on the league page.

The standings page only shows each player's total points, not the actual scores they predicted.

Your **Star Pick** is private — no one else can see which team you have nominated for any round, even after lock.`
      },
    ]
  },
]

// ─── Scoring table ────────────────────────────────────────────────────────────

function ScoringTable() {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 my-4">
      {/* Header */}
      <div className="grid grid-cols-[1fr_72px_80px] bg-yellow-500/10 border-b border-gray-700 px-4 py-2.5">
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Round</span>
        <span className="text-xs text-gray-400 text-center">Result</span>
        <span className="text-xs text-gray-400 text-center">Exact score</span>
      </div>
      {/* Rows */}
      {SCORING_ROWS.map(({ round, result, exact }, i) => (
        <div
          key={round}
          className={`grid grid-cols-[1fr_72px_80px] items-center px-4 py-3 ${
            i < SCORING_ROWS.length - 1 ? 'border-b border-gray-800/60' : ''
          }`}
        >
          <span className="text-sm text-white font-medium">{round}</span>
          <span className="text-sm font-semibold text-green-400 text-center">{result}</span>
          <span className="text-sm font-semibold text-blue-400 text-center">{exact}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Scoring FAQ (custom renderer) ───────────────────────────────────────────

function ScoringAnswer() {
  return (
    <div className="space-y-4 text-sm text-gray-400">

      {/* Group stage */}
      <div>
        <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">Group Stage</p>
        <p className="leading-relaxed">
          Predict the scoreline for each of the 48 group matches. For each match you earn:
        </p>
        <ul className="mt-2 space-y-1">
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

      {/* KO stage */}
      <div>
        <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">Knockout Rounds</p>
        <p className="leading-relaxed">
          Knockout scoring is <strong className="text-white">team-centric</strong>. For each real knockout result, the app evaluates both teams independently:
        </p>
        <ul className="mt-2 space-y-1.5">
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

      {/* Points table */}
      <ScoringTable />

      {/* Penalties note */}
      <p className="leading-relaxed text-gray-500 text-xs">
        For penalty shootouts, the winning team gets +1 added to their score for exact score comparison purposes. A match finishing 2–2 aet with Germany winning on penalties is treated as a <strong className="text-gray-300">2–3 Germany win</strong>.
      </p>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a, type }) {
  const [open, setOpen] = useState(false)

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
        <div className="px-5 pb-5 border-t border-gray-800 pt-4">
          {type === 'scoring' ? (
            <ScoringAnswer />
          ) : (
            <div className="space-y-1 text-sm text-gray-400">
              {a.split('\n').map((line, i) => {
                if (line.startsWith('• ')) {
                  return (
                    <li key={i} className="flex gap-2 items-start list-none">
                      <span className="text-yellow-400 mt-0.5 flex-shrink-0">•</span>
                      <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    </li>
                  )
                }
                if (/^[1-5]\. /.test(line)) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
                {items.map(({ q, a, type }) => (
                  <FAQItem key={q} q={q} a={a} type={type} />
                ))}
              </div>
            </div>
          ))}
        </div>


        <div className="mt-10 p-4 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-500 text-center">
          Still stuck? Ask your league admin or{' '}
          <a href="mailto:support@thematchpredictor.com" className="text-yellow-400 hover:underline">
            get in touch
          </a>{' '}
          at support@thematchpredictor.com
        </div>
      </div>
    </main>
  )
}