import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeagueLogo from '@/app/components/LeagueLogo'   // ← NEW

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get leagues the user belongs to
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header — UNCHANGED */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">World Cup Predictor</span>
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
            className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1.5"
            title="Edit profile"
          >
            👤 {profile?.display_name}
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-white transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Welcome — UNCHANGED */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back, {profile?.display_name} 👋
          </h1>
          <p className="text-gray-400">
            The 2026 World Cup kicks off June 11. Get your predictions in!
          </p>
        </div>

        {/* Action cards — UNCHANGED */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Link
            href="/dashboard/create-league"
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-3xl mb-3">🏆</div>
            <h2 className="text-xl font-bold mb-1">Create a League</h2>
            <p className="text-gray-800 text-sm">
              Set up a new private league and invite your friends
            </p>
          </Link>

          <Link
            href="/dashboard/join-league"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors"
          >
            <div className="text-3xl mb-3">🤝</div>
            <h2 className="text-xl font-bold mb-1">Join a League</h2>
            <p className="text-gray-400 text-sm">
              Enter an invite code to join a friend's league
            </p>
          </Link>

          <Link
            href="/dashboard/tournament"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-colors md:col-span-2"
          >
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-xl font-bold mb-1">Tournament Bracket</h2>
            <p className="text-gray-400 text-sm">
              Live results, group tables and the knockout bracket
            </p>
          </Link>
        </div>

        {/* My Leagues */}
        <div>
          <h2 className="text-xl font-bold mb-4">My Leagues</h2>
          {!memberships || memberships.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🏟️</div>
              <p className="text-gray-400 mb-2">You haven't joined any leagues yet</p>
              <p className="text-gray-500 text-sm">
                Create a new league or ask a friend for their invite code
              </p>
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
                    {/* ── NEW: logo + name side by side ── */}
                    <div className="flex items-center gap-3 min-w-0">
                      <LeagueLogo
                        name={league.league_name}
                        logoUrl={league.logo_url}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate">{league.league_name}</h3>
                        <p className="text-gray-500 text-sm">
                          {league.admin_id === user.id ? '⭐ Admin' : 'Member'} · 
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
      </div>
    </main>
  )
}