'use client'
// app/businesses/setup/SetupClient.js

import { useState } from 'react'
import Link from 'next/link'

export default function SetupClient({ userId, displayName }) {
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!leagueName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mini/businesses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_name: leagueName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong — please try again')
        setLoading(false)
        return
      }
      // Redirect to Lemon Squeezy checkout
      window.location.href = data.checkout_url
    } catch {
      setError('Something went wrong — please try again')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/businesses" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">The Match Predictor</span>
        </Link>
        <span className="text-sm text-gray-500">
          Signed in as <span className="text-gray-300">{displayName}</span>
        </span>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
              Business League · Knockout Mini-Game
            </div>
            <h1 className="text-3xl font-bold mb-3">Name your league</h1>
            <p className="text-gray-400 text-sm">
              This is what your members will see when they join. You can change it later.
            </p>
          </div>

          {/* Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              League name
            </label>
            <input
              type="text"
              value={leagueName}
              onChange={e => setLeagueName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={60}
              placeholder="e.g. The Crown FC Predictions"
              autoFocus
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors placeholder-gray-600"
            />
          </div>

          {/* What's included summary */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              What's included — £100 one-time
            </p>
            <ul className="space-y-1.5 text-sm text-gray-400">
              {[
                'Unlimited members',
                'Knockout bracket predictions (R32 → Final)',
                'Semi-finalist bonus round',
                'QR code table card (A5 PDF)',
                'Custom banner photo',
                'Matchday announcements & notices',
                'Standings email updates',
                'Results entered for you throughout the tournament',
                'Priority support',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-yellow-400 flex-shrink-0 text-xs">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!leagueName.trim() || loading}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-xl text-lg transition-colors"
          >
            {loading ? 'Setting up…' : 'Continue to payment — £100 →'}
          </button>

          <p className="text-center text-xs text-gray-600 mt-3">
            Secure payment via Lemon Squeezy · One-time · No subscription
          </p>

          <p className="text-center text-xs text-gray-600 mt-4">
            Not a business?{' '}
            <Link href="/mini/dashboard" className="text-yellow-400 hover:underline">
              Back to your dashboard
            </Link>
          </p>

        </div>
      </div>
    </main>
  )
}