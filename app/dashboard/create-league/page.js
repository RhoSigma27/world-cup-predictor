'use client'
// app/dashboard/create-league/page.js

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const MAIN_LOCK_TIME = new Date('2026-06-11T19:59:00Z')

export default function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const isLocked = new Date() >= MAIN_LOCK_TIME

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/signin')
      return
    }

    const inviteCode = generateInviteCode()

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        league_name: leagueName,
        admin_id: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (leagueError) {
      setError(leagueError.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: user.id })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/league/${league.id}?new=true`)
  }

  if (isLocked) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <span className="font-bold text-yellow-400">Create a League</span>
        </nav>

        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-3">Main game is closed</h1>
            <p className="text-gray-400">
              Predictions for the main World Cup game closed when the tournament kicked off on June 11.
              New leagues can no longer be created for the full 104-match prediction game.
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl flex-shrink-0">🥊</span>
              <div>
                <h2 className="font-bold text-lg text-yellow-300 mb-1">
                  Try the Knockout Mini-Game instead
                </h2>
                <p className="text-gray-400 text-sm">
                  Pick your semi-finalists and predict the winner of every knockout match —
                  from the Round of 32 to the Final. No scorelines, no group stage.
                  Simple enough to fill in at the bar.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/mini/create-league"
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl py-3 text-center text-sm transition-colors"
              >
                🏆 Create a League
              </Link>
              <Link
                href="/mini/join-league"
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold rounded-xl py-3 text-center text-sm transition-colors"
              >
                🤝 Join a League
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-600 text-sm">
            Already in a main-game league?{' '}
            <Link href="/dashboard" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Back to your dashboard →
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <span className="font-bold text-yellow-400">Create a League</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold mb-2">Create a League</h1>
          <p className="text-gray-400">
            Set up your league and invite friends with a unique code
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              League Name
            </label>
            <input
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="e.g. The Office Champions"
              required
              maxLength={50}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              This is what your friends will see when they join
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !leagueName.trim()}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create League →'}
          </button>
        </form>
      </div>
    </main>
  )
}