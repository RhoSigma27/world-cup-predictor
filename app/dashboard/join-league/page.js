'use client'
// app/dashboard/join-league/page.js

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const MAIN_LOCK_TIME = new Date('2026-06-11T19:59:00Z')

export default function JoinLeaguePage() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isLocked = new Date() >= MAIN_LOCK_TIME
  // Also show mini banner if redirected here from a post-lockout invite link
  const showMiniBanner = isLocked || searchParams.get('locked') === 'true'

  const handleJoin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/signin')
      return
    }

    try {
      const res = await fetch('/api/join-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      router.push(`/dashboard/league/${data.leagueId}`)
    } catch {
      setError('Something went wrong — please try again')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <span className="font-bold text-yellow-400">Join a League</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">

        {/* Post-lockout banner — shown above the form, not instead of it.
            People might still have a valid main-game invite link from a friend
            so we let them try the code, but make the mini-game very visible. */}
        {showMiniBanner && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8">
            <p className="font-bold text-yellow-300 mb-2">
              🥊 Looking to start fresh? Try the Knockout Mini-Game
            </p>
            <p className="text-gray-400 text-sm mb-4">
              The main game closed when the tournament kicked off on June 11. But the Knockout
              Mini-Game is open — pick your semi-finalists and predict every knockout match.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/mini/create-league"
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl py-2.5 text-center text-sm transition-colors"
              >
                🏆 Create a Mini League
              </Link>
              <Link
                href="/mini/join-league"
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold rounded-xl py-2.5 text-center text-sm transition-colors"
              >
                🤝 Join a Mini League
              </Link>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="text-3xl font-bold mb-2">Join a League</h1>
          <p className="text-gray-400">
            {showMiniBanner
              ? "Got a friend's invite code for an existing main-game league? Enter it below."
              : 'Enter the invite code your friend shared with you'
            }
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. 274AF7UW"
              required
              maxLength={8}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 font-mono text-xl tracking-widest text-center uppercase"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || inviteCode.length < 6}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join League →'}
          </button>
        </form>
      </div>
    </main>
  )
}