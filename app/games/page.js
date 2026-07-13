import Link from 'next/link'

const GAMES = [
  {
    slug: 'sundae-showdown',
    name: 'Sundae Showdown',
    emoji: '🍦',
    tagline: "Eat scoops until someone's left with nothing. Play solo against kAI Havertz, pass and play, or send your turn to a friend on WhatsApp.",
    href: '/games/sundae-showdown.html',
  },
  {
    slug: 'fibonicy-sundaes',
    name: 'Fibon-icy Sundaes',
    emoji: '🍨',
    tagline: "One bowl, take some scoops — but never more than double what the computer just took. Whoever takes the last scoop wins.",
    href: '/games/fibonicy-sundaes.html',
  },
  {
    slug: 'the-spiked-bar',
    name: 'The Spiked Bar',
    emoji: '🍫',
    tagline: "Cold War Mexico, 1970. Break off pieces of a shared chocolate bar — whoever's left holding the spiked square is out before kick-off.",
    href: '/games/the-spiked-bar.html',
  },
  {
    slug: 'rondo',
    name: 'Rondo',
    emoji: '⚽',
    tagline: 'Pass the ball between players — everyone gets 3 touches. Work out who can force the other player out of moves.',
    href: '/games/rondo.html',
  },
  {
  slug: 'big-night-out',
  name: 'Big Night Out',
  emoji: '🍻',
  tagline: 'Pick footballers from the quarter-finalists for a night out — three who know each other or three total strangers, and nobody makes tomorrow\'s match.',
  href: '/games/big-night-out.html',
},// Add more games here as you build them.
]

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">World Cup Predictor</span>
        </div>
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Back to dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold mb-2">Something to play between matches</h1>
        <p className="text-gray-400 mb-10">
          A few quick games for the downtime while you wait for kickoff.
        </p>

        <div className="space-y-4">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={game.href}
              className="block bg-gray-900 border border-gray-800 hover:border-yellow-500 rounded-2xl p-6 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{game.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold mb-1">{game.name}</h2>
                  <p className="text-gray-400 text-sm mb-2">{game.tagline}</p>
                  <span className="text-yellow-400 text-sm font-medium">Play →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}