import Link from 'next/link'
import HeroSubtitle from '@/app/components/HeroSubtitle'
import { createAdminClient } from '@/lib/supabase-admin'

export const revalidate = 21600 // revalidate every 6 hours

export const viewport = {
  themeColor: '#e8c96b',
}

export const metadata = {
  title: 'World Cup 2026 Prediction League — Free to Play',
  description: 'Create a free World Cup 2026 prediction league and compete with friends. Predict all 104 matches from group stage to the final. Free to play, no faff.',
  alternates: {
    canonical: 'https://thematchpredictor.com',
  },
  openGraph: {
    title: 'The Match Predictor — World Cup 2026 Prediction League',
    description: 'Predict every match of the 2026 World Cup and compete with friends. Free to play.',
    url: 'https://thematchpredictor.com',
  },
}

export default async function Home() {
  let leagueCount = null
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
    leagueCount = count
  } catch {
    // fail silently — counter just won't render
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">World Cup Predictor</span>
        </div>
        <Link
          href="/auth/signin"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors text-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="text-7xl mb-6">🏆</div>
        <HeroSubtitle />
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Predict with mates.
          <span className="text-yellow-400"> No fluff.</span>
          <br />Just bragging rights.
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Create a private league, predict every match of the 2026 World Cup,
          and compete against your friends and colleagues.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Start a League →
          </Link>
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
          >
            Join a League
          </Link>
        </div>
        {leagueCount !== null && (
          <p className="text-gray-500 text-sm mt-5">
            🏟️ {leagueCount} league{leagueCount === 1 ? '' : 's'} already set up
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '🏟️', title: 'Create a League', desc: 'Set up a private league in seconds and get a unique invite link to share with friends.' },
            { icon: '📝', title: 'Make Predictions', desc: 'Predict the score of every match — all 104 games from group stage to the final.' },
            { icon: '🥇', title: 'Climb the Table', desc: 'Earn points for correct results and scorelines. The leaderboard updates after every match.' },
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
        <h2 className="text-3xl font-bold text-center mb-12">Scoring</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_72px_88px] px-6 py-3 border-b border-gray-700 bg-yellow-500/10">
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Round</span>
            <span className="text-xs text-gray-400 text-center">Result</span>
            <span className="text-xs text-gray-400 text-center">Exact score</span>
          </div>
          {[
            { round: 'Group Stage',            result: '10 pts', score: '+5 pts'  },
            { round: 'Round of 32',            result: '10 pts', score: '+5 pts'  },
            { round: 'Round of 16',            result: '20 pts', score: '+10 pts' },
            { round: 'Quarter-Finals / Semis', result: '30 pts', score: '+15 pts' },
            { round: 'Bronze Final / Final',   result: '50 pts', score: '+25 pts' },
          ].map((row, i) => (
            <div
              key={row.round}
              className={`grid grid-cols-[1fr_72px_88px] items-center px-6 py-4 ${i < 4 ? 'border-b border-gray-800' : ''}`}
            >
              <span className="font-medium text-white">{row.round}</span>
              <span className="text-yellow-400 font-bold text-sm text-center">{row.result}</span>
              <span className="text-green-400 font-bold text-sm text-center">{row.score}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          ⭐ Star Pick — double points for your chosen team throughout the tournament
        </p>
      </div>

      <p className="text-center text-gray-500 text-sm mt-2">
        Questions about how scoring works?{' '}
        <Link href="/help" className="text-yellow-400 hover:underline">
          See the full scoring guide →
        </Link>
      </p>
      
      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to play?</h2>
        <p className="text-gray-400 mb-8">The 2026 World Cup kicks off June 11. Predictions lock at first whistle.</p>
        <Link
          href="/auth/signin"
          className="inline-block px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
        >
          Create Your League →
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        ⚽ World Cup Predictor 2026 — Built for football fans
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> · </span>
        <Link href="/games" className="text-yellow-400 hover:underline">
          Bored waiting for kickoff? Play a game →
        </Link>
      </footer>
    </main>
  )
}