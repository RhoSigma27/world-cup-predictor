'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinLeaguePage() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

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

    // Find league by invite code
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single()

    if (leagueError || !league) {
      setError('League not found. Check the invite code and try again.')
      setLoading(false)
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      router.push(`/dashboard/league/${league.id}`)
      return
    }

    // Join the league
    const { error: joinError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
      })

    if (joinError) {
      setError(joinError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/league/${league.id}`)
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
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="text-3xl font-bold mb-2">Join a League</h1>
          <p className="text-gray-400">
            Enter the invite code your friend shared with you
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