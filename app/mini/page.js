// app/mini/page.js
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const revalidate = 300

export const metadata = {
  title: 'KO Predictor — World Cup 2026',
  description: 'Join the World Cup 2026 Knockout Predictor. Pick your semi-finalists and predict the winner of every knockout match — round by round as the tournament unfolds.',
}

const FAQS = [
  {
    q: 'What is the KO Predictor?',
    a: 'The KO Predictor is a knockout-only prediction game for the 2026 World Cup. Instead of predicting all 104 group stage matches upfront, you focus purely on the knockout rounds — from the Round of 32 all the way to the Final. It\'s simple, fast, and designed for anyone who wants to get involved even if they missed the start of the tournament.',
  },
  {
    q: 'How does it work?',
    a: 'First, pick 4 teams you think will reach the semi-finals for a bonus points round. Then, as each knockout round begins, you predict the winner of every match in that round. You don\'t predict the whole bracket upfront — you go round by round as the real results come in. Each round you\'re shown the actual teams who made it through, so a bad Round of 32 doesn\'t affect who you pick in the Round of 16.',
  },
  {
    q: 'When can I make my predictions?',
    a: 'You can predict any match right up until it kicks off. Once a match starts, that fixture locks. Matches unlock round by round as teams are confirmed — some Round of 32 fixtures are available from June 24 as groups finish, with the rest unlocking by June 28.',
  },
  {
    q: 'What if I pick the wrong team in the Round of 32?',
    a: 'It doesn\'t matter for the next round. The Round of 16 shows you the real teams who actually won their Round of 32 matches — not your predicted winners. So everyone gets a fresh set of correct teams to pick from each round. A bad Round of 32 just costs you points in that round, not in the ones that follow.',
  },
  {
    q: 'What are the semi-finalist picks?',
    a: 'Before the knockout stage begins, you pick 4 teams you think will reach the semi-finals. This is a bonus points round — you get 20pts for 1 correct, 44pts for 2, 70pts for 3, or 100pts for all 4. These picks lock when the first knockout match kicks off on June 28.',
  },
  {
    q: 'How is scoring structured?',
    a: 'You earn points for correctly predicting the winner of each match. Points increase in later rounds: Round of 32 = 10pts, Round of 16 = 20pts, Quarter-Finals and Semis = 30pts, Bronze Final and Final = 50pts. Plus the semi-finalist bonus of up to 100pts.',
  },
  {
    q: 'Can I play in a private league?',
    a: 'Yes — the KO Predictor uses the same private league format as the main game. Create a league, share the invite link with friends, and compete on your own leaderboard. Standings update after every match.',
  },
  {
    q: 'I already play the main game. Can I also play the KO Predictor?',
    a: 'Yes — you can join or create a KO Predictor league using the same account. The two games are completely separate and don\'t affect each other. Head to the Mini-Game section on your dashboard.',
  },
  {
    q: 'Is it free?',
    a: 'The basic league (up to 6 members) is completely free. Larger leagues are available for £12 (up to 11 members) or £20 (unlimited members). Business leagues with QR table cards and email standings updates are available for £100.',
  },
]

export default async function MiniLandingPage() {
  let miniLeagueCount = null
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('mini_leagues')
      .select('*', { count: 'exact', head: true })
    miniLeagueCount = count
  } catch { /* fail silently */ }

  let isSignedIn = false
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    isSignedIn = !!user
  } catch { /* fail silently */ }

  const ctaHref  = isSignedIn ? '/mini/create-league' : '/auth/signin?next=/mini/create-league'
  const joinHref = isSignedIn ? '/mini/join-league'   : '/auth/signin?next=/mini/join-league'

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">World Cup Predictor</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Main Game</Link>
          <Link
            href={isSignedIn ? '/dashboard' : '/auth/signin'}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors text-sm"
          >
            {isSignedIn ? 'My Dashboard' : 'Sign In'}
          </Link>
        </div>
      </nav>

      {/* Late-joiner banner */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3 text-center">
        <p className="text-sm text-yellow-300">
          ⏰ The main game has kicked off — group stage predictions are locked.
          <span className="text-white font-medium"> But you can still play the KO Predictor below.</span>
        </p>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-7xl mb-6">🥊</div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          The KO Predictor
          <span className="text-yellow-400"> — no group stage needed.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
          Predict the winner of every knockout match — from the Round of 32 to the Final.
          No scorelines. No 104 matches. Just pick who goes through, round by round.
        </p>
        <p className="text-gray-500 mb-10 max-w-xl mx-auto">
          Play in a private league with friends, earn points for correct picks, and compete all the way to July 19.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={ctaHref} className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors">
            Start a League →
          </Link>
          <Link href={joinHref} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700">
            Join a League
          </Link>
        </div>
        {miniLeagueCount !== null && miniLeagueCount > 0 && (
          <p className="text-gray-500 text-sm mt-5">
            🏟️ {miniLeagueCount} KO Predictor league{miniLeagueCount === 1 ? '' : 's'} already running
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Unlike the main game, you don't predict everything upfront. You go round by round — each time with the real teams who actually made it through.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '🏆',
              title: 'Pick your semi-finalists',
              desc: 'Before the knockout stage begins, pick 4 teams you think will reach the semis. Get them right for a bonus points boost — up to 100pts.',
            },
            {
              icon: '📋',
              title: 'Predict round by round',
              desc: 'As each round begins, pick the winner of every match. You always see the real teams who made it through — a bad previous round doesn\'t affect your next one.',
            },
            {
              icon: '📈',
              title: 'Climb the table',
              desc: 'Points update after every match. Later rounds are worth more. Best predictor after the Final wins.',
            },
          ].map(item => (
            <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key feature callout */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">💡</span>
            <div>
              <h3 className="font-bold text-yellow-300 text-lg mb-2">Fresh teams every round</h3>
              <p className="text-gray-400">
                Each round you pick from the teams who <strong className="text-white">actually won</strong> the previous round — not your predicted winners.
                So if you had a rough Round of 32, you still get a clean slate for the Round of 16 with the correct 16 teams.
                Everyone stays competitive deep into the tournament.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Scoring</h2>
        <p className="text-center text-gray-400 mb-10">Higher rounds are worth more. Plus a bonus for picking semi-finalists early.</p>

        {/* Semi bonus */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">🏆 Semi-Finalist Bonus</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-300 text-sm mb-5">Pick 4 semi-finalists before the knockout stage. Points scale with how many you get right:</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { correct: '1', pts: '20' },
                { correct: '2', pts: '44' },
                { correct: '3', pts: '70' },
                { correct: '4', pts: '100' },
              ].map(ex => (
                <div key={ex.correct} className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-yellow-400 font-bold text-lg">{ex.pts} pts</div>
                  <div className="text-gray-500 text-xs mt-1">{ex.correct} correct</div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs text-center mt-4">Locks when the first knockout match kicks off</p>
          </div>
        </div>

        {/* KO points */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">📋 Knockout Predictions</h3>
          </div>
          {[
            { round: 'Round of 32',            pts: '10 pts' },
            { round: 'Round of 16',            pts: '20 pts' },
            { round: 'Quarter-Finals / Semis', pts: '30 pts' },
            { round: 'Bronze Final / Final',   pts: '50 pts' },
          ].map((row, i) => (
            <div key={row.round} className={`flex items-center justify-between px-6 py-4 ${i < 3 ? 'border-b border-gray-800' : ''}`}>
              <span className="font-medium text-white">{row.round}</span>
              <span className="text-yellow-400 font-bold text-sm">{row.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Common questions</h2>
        <div className="space-y-4">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold text-white mb-2">{q}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to play?</h2>
        <p className="text-gray-400 mb-8">
          Pick your semi-finalists now, then predict round by round as the knockout stage unfolds.
        </p>
        <Link href={ctaHref} className="inline-block px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors">
          Create Your League →
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        ⚽ World Cup Predictor 2026 — Built for football fans ·{' '}
        <Link href="/" className="hover:text-gray-400 transition-colors">Main Game</Link>
      </footer>
    </main>
  )
}