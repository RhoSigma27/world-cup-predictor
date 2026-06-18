// app/mini/dashboard/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from '@/app/components/SignOutButton'
import { MINI_LOCK_TIME } from '@/lib/worldcup'

export const revalidate = 0

const TIER_LABELS = {
  hobby:      'Hobby',
  enthusiast: 'Enthusiast',
  fanatic:    'Fanatic',
  business:   'Business',
}

export default async function MiniDashboardPage({ searchParams }) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/mini/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('mini_league_members')
    .select(`
      league_id,
      joined_at,
      nickname,
      mini_leagues (
        id,
        league_name,
        invite_code,
        admin_id,
        tier,
        is_comped,
        logo_url
      )
    `)
    .eq('user_id', user.id)

  const adminSupabase = createAdminClient()
  const leagueIds = (memberships || []).map(m => m.league_id)

  let semiPicksByLeague = {}
  if (leagueIds.length > 0) {
    const { data: semiPicks } = await adminSupabase
      .from('mini_semi_picks')
      .select('mini_league_id, team')
      .eq('user_id', user.id)
      .in('mini_league_id', leagueIds)

    for (const pick of semiPicks || []) {
      if (!semiPicksByLeague[pick.mini_league_id]) {
        semiPicksByLeague[pick.mini_league_id] = []
      }
      semiPicksByLeague[pick.mini_league_id].push(pick.team)
    }
  }

  const semiPicksOpen = new Date() < MINI_LOCK_TIME

  const sp = await searchParams
  const error      = sp?.error
  const leagueName = sp?.league_name
  const tier       = sp?.tier

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Main Game
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🥊</span>
            <span className="font-bold text-lg text-yellow-400">Knockout Mini-Game</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile?.is_superadmin && (
            <Link
              href="/admin"
              className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full hover:bg-yellow-500/30 transition-colors"
            >
              ⚡ Admin
            </Link>
          )}
          <Link
            href="/dashboard/profile"
            className="text-gray-400 hover:text-white text-sm transition-colors"
            title="Edit profile"
          >
            👤 {profile?.display_name}
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Error banners ─────────────────────────────────────────────── */}
        {error === 'league-full' && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-1">
              🚫 {leagueName ? `"${leagueName}" is full` : 'That league is full'}
            </p>
            <p className="text-sm text-gray-400">
              This league is on the{' '}
              <span className="text-white font-medium">{TIER_LABELS[tier] ?? 'Hobby'}</span> tier
              and has reached its member limit.
              Ask the league admin to upgrade for more spots.
            </p>
          </div>
        )}

        {error === 'invalid-invite' && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-1">Invalid invite code</p>
            <p className="text-sm text-gray-400">
              That invite link doesn't match any mini-game league. Ask your league admin to share a fresh link.
            </p>
          </div>
        )}

        {error === 'join-failed' && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-1">Couldn't join league</p>
            <p className="text-sm text-gray-400">
              Something went wrong. Please try the invite link again or contact support.
            </p>
          </div>
        )}
        {/* ──────────────────────────────────────────────────────────────── */}

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Mini-Game Dashboard 🥊</h1>
          <p className="text-gray-400">Knockout predictions — no group stage required.</p>
        </div>

        {/* Semi-final picks status banner */}
        {semiPicksOpen ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🏆</span>
              <div>
                <p className="font-bold text-yellow-300 mb-1">Semi-finalist picks are open</p>
                <p className="text-sm text-gray-400">
                  Pick 4 teams you think will reach the semi-finals for a bonus points round.
                  Picks lock at half-time of the first knockout match on June 28.
                  Head into each league to make your selections.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔒</span>
              <div>
                <p className="font-bold text-white mb-1">Semi-finalist picks locked</p>
                <p className="text-sm text-gray-400">
                  The knockout stage has begun. Head into each league to predict the bracket.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Link
            href="/mini/create-league"
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-2xl p-6 transition-colors"
          >
            <div className="text-3xl mb-3">🏆</div>
            <h2 className="text-xl font-bold mb-1">Create a League</h2>
            <p className="text-gray-800 text-sm">Set up a new mini-game league and invite friends</p>
          </Link>

          <Link
            href="/mini/join-league"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors"
          >
            <div className="text-3xl mb-3">🤝</div>
            <h2 className="text-xl font-bold mb-1">Join a League</h2>
            <p className="text-gray-400 text-sm">Enter an invite code to join a friend's mini-game league</p>
          </Link>
        </div>

        {/* My mini-game leagues */}
        <div>
          <h2 className="text-xl font-bold mb-4">My Mini-Game Leagues</h2>
          {!memberships || memberships.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🥊</div>
              <p className="text-gray-400 mb-2">You haven't joined any mini-game leagues yet</p>
              <p className="text-gray-500 text-sm">
                Create a new league or ask a friend for their invite code
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map(({ mini_leagues: league, joined_at, nickname }) => {
                const userSemiPicks = semiPicksByLeague[league.id] || []
                const hasSemiPicks  = userSemiPicks.length === 4

                return (
                  <Link
                    key={league.id}
                    href={`/mini/league/${league.id}`}
                    className="block bg-gray-900 border border-gray-800 hover:border-yellow-500 rounded-2xl p-5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-lg truncate">{league.league_name}</h3>
                          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                            {TIER_LABELS[league.tier] ?? 'Hobby'}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm">
                          {league.admin_id === user.id ? '⭐ Admin' : 'Member'} ·{' '}
                          Joined {new Date(joined_at).toLocaleDateString('en-GB')}
                          {nickname ? ` · Playing as "${nickname}"` : ''}
                        </p>
                        {semiPicksOpen && !hasSemiPicks && (
                          <p className="text-yellow-400 text-xs mt-1.5 font-medium">
                            ⚠️ Semi-finalist picks not submitted yet
                          </p>
                        )}
                        {semiPicksOpen && hasSemiPicks && (
                          <p className="text-green-400 text-xs mt-1.5">
                            ✓ Semi-finalist picks submitted
                          </p>
                        )}
                      </div>
                      <div className="text-gray-400 flex-shrink-0">→</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}