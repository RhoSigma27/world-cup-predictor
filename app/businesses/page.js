// app/businesses/page.js
import Link from 'next/link'

export const metadata = {
  title: 'Business Leagues — The Match Predictor',
  description: 'Run a World Cup 2026 knockout prediction league for your pub, office or sports club. Unlimited members, QR table cards, and results handled for you.',
}

const FEATURES = [
  {
    icon: '🥊',
    title: 'Knockout bracket only',
    desc: 'No 104 scorelines. Members just pick the winner of each knockout match — simple enough to fill in at the bar in under 5 minutes.',
  },
  {
    icon: '👥',
    title: 'Unlimited members',
    desc: 'No cap on how many people join. Whether you have 20 regulars or 200, everyone gets a spot.',
  },
  {
    icon: '📋',
    title: 'QR table card',
    desc: 'We generate a print-ready A5 PDF with your league\'s QR code. Put one on every table and watch people join instantly.',
  },
  {
    icon: '📧',
    title: 'Standings updates',
    desc: 'Email the latest leaderboard to every member at the tap of a button. Stir up the competition between matches.',
  },
  {
    icon: '📌',
    title: 'Matchday announcements',
    desc: 'Pin notices directly to your league page — daily specials, match screenings, or promotions. Members see them every time they check in.',
  },
  {
    icon: '⚽',
    title: 'Results entered for you',
    desc: 'You don\'t need to do a thing during the tournament. We enter every result as it happens so scores update in real time.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Create your league',
    desc: 'Sign up, name your league, and get your unique invite code and QR card in under two minutes.',
  },
  {
    n: '2',
    title: 'Print the QR card',
    desc: 'Download your A5 QR table card and print it. Leave one on every table, the bar, or the office noticeboard.',
  },
  {
    n: '3',
    title: 'Watch your people compete',
    desc: 'Members scan, join, and pick their winners. Check the standings, send updates, and let the banter do the rest.',
  },
]

const FAQS = [
  {
    q: 'How does the mini-game work?',
    a: 'Members pick the winner of every knockout match — from the Round of 32 all the way to the Final. No scorelines, no group stage faff. Just pick who goes through. Higher rounds are worth more points.',
  },
  {
    q: 'How many people can join?',
    a: 'Unlimited. There\'s no cap on the Business tier — whether it\'s 20 regulars or 200, everyone gets a spot.',
  },
  {
    q: 'When can members start playing?',
    a: 'Straight away. Before the knockout draw is confirmed, members pick their four semi-finalists for a bonus points round. Once the R32 draw is set (around June 28), they fill in the full bracket.',
  },
  {
    q: 'Do I need to enter match results myself?',
    a: 'No. We enter every result throughout the tournament so your league\'s scores and standings update automatically.',
  },
  {
    q: 'Can I customise the league with my branding?',
    a: 'Yes — you can upload a league logo and a header banner photo. It takes about 30 seconds.',
  },
  {
    q: 'Is it a subscription?',
    a: 'No. It\'s a single one-time payment of £100 for the remainder of the 2026 World Cup. No recurring charges.',
  },
  {
    q: 'What if I need help?',
    a: 'Email us at support@thematchpredictor.com. Business league customers get priority responses throughout the tournament.',
  },
]

export default function BusinessesPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">The Match Predictor</span>
        </Link>
        <Link
          href="/auth/signin"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors text-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-block text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-6">
          Pubs · Offices · Sports Clubs
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          The knockout predictor
          <br />
          <span className="text-yellow-400">for your pub, office or club.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
          Run a World Cup 2026 knockout prediction league for your venue or group.
          Members pick the winner of each match — no scorelines, no faff.
          Simple enough to fill in at the bar.
        </p>
        <p className="text-gray-500 mb-10 max-w-xl mx-auto text-sm">
          Unlimited members, QR table cards, standings emails, and results handled for you throughout the tournament.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/businesses/setup"
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get started — £100 →
          </Link>
          <div className="flex flex-col items-center gap-1">
            <a
              href="mailto:support@thematchpredictor.com?subject=Business league enquiry"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
            >
              Questions? Get in touch
            </a>
            <span className="text-gray-500 text-xs">support@thematchpredictor.com</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mt-4">One-time payment · No subscription · Knockout stage starts ~June 28</p>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Simple enough for a casual fan</h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
          The main World Cup prediction game asks you to fill in 104 scorelines. This isn't that.
          Members just pick a winner for each knockout match — 32 matches in total.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(s => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 bg-yellow-500 text-gray-950 font-bold text-xl rounded-full flex items-center justify-center mx-auto mb-4">
                {s.n}
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">How scoring works</h2>
        <p className="text-center text-gray-400 mb-10">
          Correct winner picks earn points — higher rounds are worth more.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-3 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">📋 Knockout Predictions</h3>
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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-bold text-white mb-1">Semi-finalist bonus round</p>
              <p className="text-sm text-gray-400">
                Before the knockout draw is confirmed, members pick their 4 semi-finalists.
                Bonus points awarded based on how many they get right — up to 150 points.
                Something to engage with from day one.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-3">Everything you need</h2>
        <p className="text-gray-500 text-center mb-12">One payment covers the full knockout tournament.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-8 text-center">
          <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Business League</div>
          <div className="text-6xl font-bold text-white mb-2">£100</div>
          <div className="text-gray-500 mb-2">One-time · Full knockout tournament · No subscription</div>
          <p className="text-sm text-gray-500 mb-6">Less than £1 per person for a venue of 100.</p>
          <ul className="text-sm text-gray-400 space-y-2 mb-8 text-left">
            {[
              'Unlimited members',
              'QR code table card (A5 PDF)',
              'Custom logo and banner photo',
              'Matchday announcements and notices',
              'Standings email updates to all members',
              'Results entered throughout the tournament',
              'Priority support',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-yellow-400 flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/businesses/setup"
            className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get Started →
          </Link>
          <p className="text-xs text-gray-600 mt-3">
            Already have an account?{' '}
            <Link href="/mini/dashboard" className="text-yellow-400 hover:underline">Go to your dashboard</Link>
          </p>
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

      {/* Bottom CTA */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-gray-400 mb-8">
          The knockout stage begins around June 28. Get your league set up now so members
          can pick their semi-finalists straight away.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/businesses/setup"
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get started — £100 →
          </Link>
          <div className="flex flex-col items-center gap-1">
            <a
              href="mailto:support@thematchpredictor.com?subject=Business league enquiry"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
            >
              Get in touch
            </a>
            <span className="text-gray-500 text-xs">support@thematchpredictor.com</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
          <a href="mailto:support@thematchpredictor.com" className="hover:text-gray-300 transition-colors">Support</a>
        </div>
        ⚽ The Match Predictor · NostraGamus Limited
      </footer>

    </main>
  )
}