import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — The Match Predictor',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">The Match Predictor</span>
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        {/* PASTE YOUR PRIVACY POLICY CONTENT HERE */}
        <div className="text-gray-400 text-sm">Content coming soon.</div>
      </div>
    </main>
  )
}