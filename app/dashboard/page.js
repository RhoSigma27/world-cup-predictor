// app/dashboard/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeagueLogo from '@/app/components/LeagueLogo'
import SignOutButton from '@/app/components/SignOutButton'
import { GLOBAL_LOCK_DATE } from '@/lib/predictionsLock'

const TIER_LABELS = {
  hobby:      'Hobby',
  enthusiast: 'Enthusiast',
  fanatic:    'Fanatic',
  business:   'Business',
}

export default async function DashboardPage({ searchParams }) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('league_members')
    .select(`
      league_id,
      joined_at,
      leagues (
        id,
        league_name,
        invite_code,
        admin_id,
        slug,
        logo_url
      )
    `)
    .eq('user_id', user.id)

  const { data: miniMemberships } = await supabase
    .from('mini_league_members')
    .select('league_id')
    .eq('user_id', user.id)

  const miniLeagueCount = miniMemberships?.length ?? 0
  const mainGameLocked = new Date() >= GLOBAL_LOCK_DATE

  const sp = await searchParams
  const error      = sp?.error
  const leagueName = sp?.league_name
  const tier       = sp?.tier
  const adminName  = sp?.admin

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">World Cup Predictor</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/games"
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors"
          >
            🍦 Play something else
          </Link>
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
            className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1.5"
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
              Ask <span className="text-white font-medium">{adminName ?? 'the league admin'}</span> to
              upgrade the league to add more members.
            </p>
          </div>
        )}

        {error === 'invalid-invite' && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-1">Invalid invite code</p>
            <p className="text-sm text-gray-400">
              That invite link doesn't match any league. Ask your league admin to share a fresh link.
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

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back, {profile?.display_name} 👋
          </h1>
          <p className="text-gray-400">
            {mainGameLocked
              ? 'The 2026 World Cup is underway. Good luck!'
              : 'The 2026 World Cup kicks off June 11. Get your predictions in!'
            }
          </p>
        </div>

        {/* ── Action cards ─────────────────────────────────────────────── */}
        {mainGameLocked ? (
          <div className="mb-10 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">🔒</span>
                <div>
                  <h2 className="font-bold text-lg mb-1">Main game predictions are closed</h2>
                  <p className="text-gray-400 text-sm">
                    The group stage kicked off on June 11 and predictions for the main game are now locked.
                    If you're looking to join a friend's existing league, ask them to share their invite link directly.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl flex-shrink-0">🥊</span>
                <div>
                  <h2 className="font-bold text-lg mb-1 text-yellow-300">
                    Still want to play? Try the KO Predictor
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Pick your semi-finalists and predict the winner of every knockout match —
                    from the Round of 32 all the way to the Final. No scorelines, no group stage.
                    Simple enough to fill in at the bar.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/mini/create-league"
                  className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-xl p-4 transition-colors text-center font-bold"
                >
                  🏆 Create a KO Predictor League
                </Link>
                <Link
                  href="/mini/join-league"
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl p-4 transition-colors text-center font-bold"
                >
                  🤝 Join a KO Predictor League
                </Link>
              </div>
            </div>

            <Link
              href="/dashboard/tournament"
              className="block bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors"
            >
              <div className="text-3xl mb-3">📊</div>
              <h2 className="text-xl font-bold mb-1">Tournament Bracket</h2>
              <p className="text-gray-400 text-sm">Live results, group tables and the knockout bracket</p>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            <Link
              href="/dashboard/create-league"
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-2xl p-6 transition-colors group"
            >
              <div className="text-3xl mb-3">🏆</div>
              <h2 className="text-xl font-bold mb-1">Create a League</h2>
              <p className="text-gray-800 text-sm">Set up a new private league and invite your friends</p>
            </Link>

            <Link
              href="/dashboard/join-league"
              className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors"
            >
              <div className="text-3xl mb-3">🤝</div>
              <h2 className="text-xl font-bold mb-1">Join a League</h2>
              <p className="text-gray-400 text-sm">Enter an invite code to join a friend's league</p>
            </Link>

            <Link
              href="/dashboard/tournament"
              className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors md:col-span-2"
            >
              <div className="text-3xl mb-3">📊</div>
              <h2 className="text-xl font-bold mb-1">Tournament Bracket</h2>
              <p className="text-gray-400 text-sm">Live results, group tables and the knockout bracket</p>
            </Link>
          </div>
        )}

        {/* ── My Leagues ────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">My Leagues</h2>
          {!memberships || memberships.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🏟️</div>
              <p className="text-gray-400 mb-2">You haven't joined any leagues yet</p>
              <p className="text-gray-500 text-sm">Create a new league or ask a friend for their invite code</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map(({ leagues: league, joined_at }) => (
                <Link
                  key={league.id}
                  href={`/dashboard/league/${league.id}`}
                  className="block bg-gray-900 border border-gray-800 hover:border-yellow-500 rounded-2xl p-5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <LeagueLogo name={league.league_name} logoUrl={league.logo_url} size="sm" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate">{league.league_name}</h3>
                        <p className="text-gray-500 text-sm">
                          {league.admin_id === user.id ? '⭐ Admin' : 'Member'} ·{' '}
                          Joined {new Date(joined_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400 flex-shrink-0">→</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── KO Predictor ──────────────────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🥊 KO Predictor</h2>
            {miniLeagueCount > 0 && (
              <Link href="/mini/dashboard" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                View all →
              </Link>
            )}
          </div>

          {miniLeagueCount === 0 ? (
            <Link
              href="/mini/dashboard"
              className="block bg-gray-900 border border-gray-800 hover:border-yellow-500/50 rounded-2xl p-6 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">🥊</span>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    {mainGameLocked ? 'Play the KO Predictor' : 'Know someone who missed the main game?'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    {mainGameLocked
                      ? 'Pick your semi-finalists and predict every knockout match. Simple, fast, and still competitive.'
                      : 'The KO Predictor lets late joiners predict every knockout match — starting from the Round of 32.'
                    }
                  </p>
                  <span className="text-yellow-400 text-sm font-medium">Go to KO Predictor →</span>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/mini/dashboard"
              className="block bg-gray-900 border border-gray-800 hover:border-yellow-500 rounded-2xl p-5 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥊</span>
                  <div>
                    <h3 className="font-bold text-lg">KO Predictor</h3>
                    <p className="text-gray-500 text-sm">
                      {miniLeagueCount} league{miniLeagueCount !== 1 ? 's' : ''} · Tap to manage
                    </p>
                  </div>
                </div>
                <div className="text-gray-400 flex-shrink-0">→</div>
              </div>
            </Link>
          )}
        </div>

      </div>
    </main>
  )
}