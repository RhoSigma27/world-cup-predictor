'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

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

    // Create the league
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

    // Add creator as first member
    const { error: memberError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // Redirect to the league page
    router.push(`/dashboard/league/${league.id}?new=true`)
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