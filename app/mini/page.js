// app/mini/page.js
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const revalidate = 300

export const metadata = {
  title: 'Knockout Mini-Game — World Cup 2026',
  description: 'Missed the main game? Join the Knockout Mini-Game — pick your semi-finalists and predict every knockout match from the Round of 32.',
}

export default async function MiniLandingPage() {
  let miniLeagueCount = null
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('mini_leagues')
      .select('*', { count: 'exact', head: true })
    miniLeagueCount = count
  } catch {
    // fail silently
  }

  let isSignedIn = false
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    isSignedIn = !!user
  } catch {
    // fail silently
  }

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
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            Main Game
          </Link>
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
          <span className="text-white font-medium"> But you can still play the Knockout Mini-Game below.</span>
        </p>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-7xl mb-6">🥊</div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Still want to play?
          <span className="text-yellow-400"> We've got you.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
          The knockout rounds are where it gets serious. Pick your semi-finalists now,
          then predict the winner of every knockout match from the Round of 32 onwards.
        </p>
        <p className="text-gray-500 mb-10 max-w-xl mx-auto">
          Create a private league with friends who missed the main game — or join one that's already running.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={ctaHref}
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Start a Mini-Game League →
          </Link>
          <Link
            href={joinHref}
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
          >
            Join a League
          </Link>
        </div>
        {miniLeagueCount !== null && miniLeagueCount > 0 && (
          <p className="text-gray-500 text-sm mt-5">
            🏟️ {miniLeagueCount} mini-game league{miniLeagueCount === 1 ? '' : 's'} already running
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '🏆',
              title: 'Pick Your Semi-Finalists',
              desc: 'Before the knockout draw is confirmed, pick the 4 teams you think will reach the semi-finals. Bonus points based on how many you get right.',
            },
            {
              icon: '📋',
              title: 'Predict the Knockouts',
              desc: 'Once the Round of 32 draw is set (~June 28), predict the winner of every knockout match all the way to the Final. No scorelines — just pick who goes through.',
            },
            {
              icon: '📈',
              title: 'Climb the Table',
              desc: 'Points update after every match. Higher rounds are worth more. Best predictor at the end of the tournament wins.',
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

      {/* Scoring */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Scoring</h2>
        <p className="text-center text-gray-400 mb-10">
          Two ways to earn points — a semi-finalist bonus and knockout predictions.
        </p>

        {/* Semi-finalist bonus */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
              🏆 Semi-Finalist Bonus
            </h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-300 text-sm mb-5">
              Pick 4 semi-finalists before the knockout draw. Points scale with how many you get right:
            </p>
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
            <p className="text-gray-600 text-xs text-center mt-4">
              Locks when the Round of 32 begins (~June 28)
            </p>
          </div>
        </div>

        {/* KO predictions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
              📋 Knockout Predictions
            </h3>
          </div>
          {[
            { round: 'Round of 32',            pts: '10 pts' },
            { round: 'Round of 16',            pts: '20 pts' },
            { round: 'Quarter-Finals / Semis', pts: '30 pts' },
            { round: 'Bronze Final / Final',   pts: '50 pts' },
          ].map((row, i) => (
            <div
              key={row.round}
              className={`flex items-center justify-between px-6 py-4 ${i < 3 ? 'border-b border-gray-800' : ''}`}
            >
              <span className="font-medium text-white">{row.round}</span>
              <span className="text-yellow-400 font-bold text-sm">{row.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to play?</h2>
        <p className="text-gray-400 mb-8">
          Join now and pick your semi-finalists straight away.
          The knockout bracket opens around June 28.
        </p>
        <Link
          href={ctaHref}
          className="inline-block px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
        >
          Create Your Mini-Game League →
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