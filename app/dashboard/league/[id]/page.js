import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CopyButton from './CopyButton'
import ScoringGuide from './ScoringGuide'
import MembersList from './MembersList'
import LeagueLogo from '@/app/components/LeagueLogo'

export const revalidate = 0

const TIER_LIMITS  = { hobby: 6, enthusiast: 11, fanatic: Infinity, business: Infinity }
const TIER_LABELS  = { hobby: 'Hobby', enthusiast: 'Enthusiast', fanatic: 'Fanatic', business: 'Business' }

export default async function LeaguePage({ params, searchParams }) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const { new: isNew, upgraded } = await searchParams

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
      nickname,
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

  // Tier / member count helpers
  const tier       = league.tier ?? 'hobby'
  const isComped   = league.is_comped === true
  const tierLimit  = isComped ? Infinity : (TIER_LIMITS[tier] ?? 6)
  const tierLabel  = TIER_LABELS[tier] ?? 'Hobby'
  const memberCount = members.length
  const atLimit    = isFinite(tierLimit) && memberCount >= tierLimit

  // Fetch fixtures
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
        <div className="flex items-center gap-3">
          <LeagueLogo name={league.league_name} logoUrl={league.logo_url} size="sm" />
          <span className="font-bold text-yellow-400">{league.league_name}</span>
        </div>
        {isAdmin && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Admin</span>
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

        {/* Upgrade success banner */}
        {upgraded === 'true' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6 text-center">
            <p className="text-green-400 font-bold text-lg mb-1">🎉 League upgraded!</p>
            <p className="text-gray-400 text-sm">Your new member limit is now active.</p>
          </div>
        )}

        {/* Pinned notice */}
        {league.notice && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 flex-shrink-0">📌</span>
              <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                {league.notice.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  /^https?:\/\//.test(part)
                    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline hover:text-yellow-300">{part}</a>
                    : part
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">
            👥 Members ({memberCount}{isFinite(tierLimit) ? `/${tierLimit}` : ''})
          </h2>
          <MembersList
            members={members}
            adminId={league.admin_id}
            currentUserId={user.id}
            fixtures={fixtures || []}
            leagueId={id}
          />
        </div>

        {/* Action buttons */}
        <Link
          href={`/dashboard/league/${id}/standings`}
          className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-center transition-colors mb-3"
        >
          🏅 League Standings
        </Link>

        {isAdmin && (
          <Link
            href={`/dashboard/league/${id}/admin`}
            className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl text-center transition-colors mb-3 border border-yellow-500/20"
          >
            ⚙️ League Admin
          </Link>
        )}

        <Link
          href={`/dashboard/league/${id}/predictions`}
          className="hidden sm:block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg text-center transition-colors mb-6"
        >
          📝 Enter My Predictions →
        </Link>

        {/* Invite Friends */}
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

          {/* Member count + tier info */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800 gap-3 flex-wrap">
            <span className="text-sm text-gray-500">
              {memberCount} member{memberCount !== 1 ? 's' : ''} · {isComped ? 'Comped' : tierLabel} tier
              {isFinite(tierLimit) ? ` (max ${tierLimit})` : ' (unlimited)'}
              {atLimit && <span className="text-red-400 ml-1 font-medium">· full</span>}
            </span>
            {isAdmin && isFinite(tierLimit) && (
              <Link
                href={`/dashboard/league/${id}/admin`}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-medium transition-colors flex-shrink-0"
              >
                Want more members? Upgrade →
              </Link>
            )}
          </div>
        </div>

        <ScoringGuide />

        <div className="h-24 sm:hidden" />
      </div>

      {/* Mobile sticky predictions button */}
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