import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CopyButton from './CopyButton'
import ScoringGuide from './ScoringGuide'
import MembersList from './MembersList'

export default async function LeaguePage({ params, searchParams }) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const { new: isNew } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  // Get league details
  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !league) redirect('/dashboard')

  // Get members (excluding banned users)
  const { data: membersRaw } = await adminSupabase
    .from('league_members')
    .select(`
      user_id,
      joined_at,
      profiles (
        display_name,
        email,
        is_banned
      )
    `)
    .eq('league_id', id)

  const members = (membersRaw || []).filter(m => !m.profiles?.is_banned)

  const isAdmin = league.admin_id === user.id
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join/${league.invite_code}`

  // Fetch fixtures so MembersList can build bracket context client-side
  const { data: fixtures } = await adminSupabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
        <span className="font-bold text-yellow-400">{league.league_name}</span>
        {isAdmin && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            Admin
          </span>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* New league celebration */}
        {isNew && (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 mb-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-green-400 mb-1">League Created!</h2>
            <p className="text-gray-400 text-sm">Share the invite link below with your friends</p>
          </div>
        )}

        {/* Invite section */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">🔗 Invite Friends</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Invite Code</label>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-2xl font-mono font-bold text-yellow-400 tracking-widest">
                  {league.invite_code}
                </code>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Invite Link</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-gray-300 bg-gray-800 px-3 py-2 rounded-lg flex-1 truncate">
                  {inviteUrl}
                </code>
                <CopyButton text={inviteUrl} />
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">
            👥 Members ({members?.length || 0})
          </h2>
          <MembersList
            members={members}
            adminId={league.admin_id}
            currentUserId={user.id}
            fixtures={fixtures || []}
            leagueId={id}
          />
        </div>

        {/* Scoring guide */}
        <ScoringGuide />

        {/* Standings */}
        <Link
          href={`/dashboard/league/${id}/standings`}
          className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-center transition-colors mb-3"
        >
          🏅 League Standings
        </Link>

        {/* Predictions button — inline on desktop only */}
        <Link
          href={`/dashboard/league/${id}/predictions`}
          className="hidden sm:block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg text-center transition-colors"
        >
          📝 Enter My Predictions →
        </Link>

        {/* Spacer so content clears the mobile sticky bar */}
        <div className="h-24 sm:hidden" />
      </div>

      {/* Predictions button — sticky footer on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800 sm:hidden z-40">
        <Link
          href={`/dashboard/league/${id}/predictions`}
          className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg text-center transition-colors"
        >
          📝 Enter My Predictions →
        </Link>
      </div>
    </main>
  )
}