import Link from 'next/link'

export const metadata = {
  title: 'Business Leagues — The Match Predictor',
  description: 'Run a World Cup 2026 prediction league for your pub, office or sports club. Unlimited members, QR table cards, and results handled for you.',
}

const FEATURES = [
  {
    icon: '👥',
    title: 'Unlimited members',
    desc: 'No cap on how many people join your league. Whether you have 20 regulars or 200, everyone gets a spot.',
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
    desc: 'Pin notices directly to your league page — daily specials, match screenings, events, or promotions. Members see them every time they check the app.',
  },
  {
    icon: '⚽',
    title: 'Results entered for you',
    desc: 'You don\'t need to do a thing during the tournament. We enter every match result as it happens so scores update in real time.',
  },
  {
    icon: '🖼️',
    title: 'Custom branding',
    desc: 'Upload your logo and a banner photo to make the league page feel like your own. Great for pubs and branded workplace leagues.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Create your league',
    desc: 'Sign up, create a Business league, and get your unique invite code in under two minutes.',
  },
  {
    n: '2',
    title: 'Print the QR card',
    desc: 'Download your A5 QR table card and print it. Leave one on every table, the bar, or the office noticeboard.',
  },
  {
    n: '3',
    title: 'Watch your people compete',
    desc: 'Members scan, join, and make their predictions. Check the standings, send updates, and let the banter do the rest.',
  },
]

const FAQS = [
  {
    q: 'How many people can join?',
    a: 'Unlimited. There\'s no cap on the Business tier — whether it\'s 20 regulars or 200, everyone gets a spot.',
  },
  {
    q: 'Do I need to enter match results myself?',
    a: 'No. We enter every result throughout the tournament so your league\'s scores and standings update automatically. You just manage the league page.',
  },
  {
    q: 'Can I customise the league with my branding?',
    a: 'Yes — you can upload a league logo and a header banner photo to the league page. It takes about 30 seconds.',
  },
  {
    q: 'How do I send a matchday announcement?',
    a: 'From your league admin page, use the Pinned Notice to post a message to the league page, or the Email Standings button to send an update with a custom message to all members — perfect for matchday menus, promotions, or leaderboard taunts.',
  },
  {
    q: 'Is it a subscription?',
    a: 'No. It\'s a single one-time payment of £100 for the duration of the 2026 World Cup. No recurring charges.',
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
          Give your regulars
          <br />
          <span className="text-yellow-400">something to shout about.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Run a World Cup 2026 prediction league for your pub, office or club.
          Unlimited members, results handled for you, and all the tools to keep things lively throughout the tournament.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get started — £100 →
          </Link>
          <a
            href="mailto:support@thematchpredictor.com?subject=Business league enquiry"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
          >
            Questions? Get in touch
          </a>
        </div>
        <p className="text-gray-600 text-sm mt-4">One-time payment · No subscription · Tournament starts 11 June 2026</p>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-3">Everything you need</h2>
        <p className="text-gray-500 text-center mb-12">One payment covers the full tournament, start to finish.</p>
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

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Up and running in minutes</h2>
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

      {/* Pricing */}
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-8 text-center">
          <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Business League</div>
          <div className="text-6xl font-bold text-white mb-2">£100</div>
          <div className="text-gray-500 mb-6">One-time · Full tournament · No subscription</div>
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
            href="/auth/signin"
            className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get Started →
          </Link>
          <p className="text-xs text-gray-600 mt-3">
            Already have an account?{' '}
            <Link href="/dashboard" className="text-yellow-400 hover:underline">Go to your dashboard</Link>
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
          The 2026 World Cup kicks off 11 June. Get your league set up before then and your members will have their predictions locked in from day one.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            Get started — £100 →
          </Link>
          <a
            href="mailto:support@thematchpredictor.com?subject=Business league enquiry"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors border border-gray-700"
          >
            Get in touch
          </a>
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