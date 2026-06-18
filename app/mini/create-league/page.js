'use client'
// app/mini/create-league/page.js

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

const TIERS = [
  {
    key: 'hobby',
    label: 'Hobby',
    price: 'Free',
    members: 'Up to 6 members',
    desc: 'Perfect for a small group of friends.',
    highlight: false,
  },
  {
    key: 'enthusiast',
    label: 'Enthusiast',
    price: '£12',
    members: 'Up to 11 members',
    desc: 'Great for a bigger group or office.',
    highlight: false,
  },
  {
    key: 'fanatic',
    label: 'Fanatic',
    price: '£20',
    members: 'Unlimited members',
    desc: 'No limits — invite everyone.',
    highlight: true,
  },
]

export default function MiniCreateLeaguePage() {
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!leagueName.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/signin?next=/mini/create-league')
      return
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode()

    // Create the mini league at hobby tier
    const { data: league, error: leagueError } = await supabase
      .from('mini_leagues')
      .insert({
        league_name: leagueName.trim(),
        admin_id: user.id,
        invite_code: inviteCode,
        tier: 'hobby',
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
      .from('mini_league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    router.push(`/mini/league/${league.id}?new=true`)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/mini/dashboard" className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <span className="font-bold text-yellow-400">Create a Mini-Game League</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🥊</div>
          <h1 className="text-3xl font-bold mb-2">Create a League</h1>
          <p className="text-gray-400">
            Set up your knockout mini-game league and invite friends
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          {/* League name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              League Name
            </label>
            <input
              type="text"
              value={leagueName}
              onChange={e => setLeagueName(e.target.value)}
              placeholder="e.g. The Pub Knockouts"
              required
              maxLength={60}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              This is what your friends will see when they join
            </p>
          </div>

          {/* Tier info */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">
              Available tiers
            </p>
            <div className="space-y-2">
              {TIERS.map(tier => (
                <div
                  key={tier.key}
                  className={`rounded-xl p-4 border ${
                    tier.highlight
                      ? 'border-yellow-500/40 bg-yellow-500/5'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{tier.label}</span>
                      {tier.highlight && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-yellow-400">{tier.price}</span>
                  </div>
                  <p className="text-xs text-gray-400">{tier.members} · {tier.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">
                🎯 Your league starts on the free <span className="text-white font-medium">Hobby tier</span> (up to 6 members).
                You can upgrade anytime from the league admin page.
              </p>
            </div>
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
            {loading ? 'Creating…' : 'Create League →'}
          </button>
        </form>
      </div>
    </main>
  )
}