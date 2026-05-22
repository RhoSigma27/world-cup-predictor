// app/dashboard/league/[id]/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CopyButton from './CopyButton'
import ScoringGuide from './ScoringGuide'
import MembersList from './MembersList'
import LeagueLogo from '@/app/components/LeagueLogo'
import StandingsShareButton from './standings/StandingsShareButton'
import { scoreParticipant } from '@/lib/scoringEngine'

export const revalidate = 0

const TIER_LIMITS  = { hobby: 6, enthusiast: 11, fanatic: Infinity, business: Infinity }
const TIER_LABELS  = { hobby: 'Hobby', enthusiast: 'Enthusiast', fanatic: 'Fanatic', business: 'Business' }

// ─── generateMetadata ─────────────────────────────────────────────────────────
// Provides OG image when the league invite URL is pasted into WhatsApp / iMessage.

export async function generateMetadata({ params }) {
  const { id } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'

  try {
    const supabase = await createServerSupabaseClient()
    const admin    = createAdminClient()

    const { data: league } = await supabase
      .from('leagues')
      .select('league_name, tier, banner_url')
      .eq('id', id)
      .single()

    if (!league) return {}

    const { data: members } = await admin
      .from('league_members')
      .select('user_id, nickname, profiles(display_name, is_banned)')
      .eq('league_id', id)

    const activeMembers = (members || []).filter(m => !m.profiles?.is_banned)

    // Fetch fixtures + predictions for scoring
    const [{ data: fixtures }, { data: allPredictions }, { data: allExtras }, { data: masterExtras }] =
      await Promise.all([
        admin.from('fixtures').select('*').order('match_number', { ascending: true }),
        admin.from('predictions').select('*').eq('league_id', id),
        admin.from('extras_predictions').select('*').eq('league_id', id),
        supabase.from('master_extras').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
      ])

    const scored = activeMembers.map(m => {
      const userPreds  = (allPredictions || []).filter(p => p.user_id === m.user_id)
      const userExtras = (allExtras || []).find(e => e.user_id === m.user_id) || null
      const { total }  = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
      return { name: m.nickname || m.profiles?.display_name || '?', pts: total }
    })
    scored.sort((a, b) => b.pts - a.pts)

    const payload = {
      leagueName: league.league_name,
      bannerUrl:  league.tier === 'business' && league.banner_url ? league.banner_url : null,
      top5:  scored.slice(0, 5).map((s, i) => ({ rank: i + 1, name: s.name, pts: s.pts })),
      count: activeMembers.length,
    }

    const d          = Buffer.from(JSON.stringify(payload)).toString('base64')
    const ogImageUrl = `${siteUrl}/api/og/standings?d=${encodeURIComponent(d)}`
    const pageUrl    = `${siteUrl}/dashboard/league/${id}`

    return {
      title: `Join ${league.league_name} — World Cup 2026 Predictor`,
      description: `${activeMembers.length} members competing. Play free at thematchpredictor.com`,
      openGraph: {
        title: `${league.league_name} — World Cup 2026 Predictor`,
        description: `${activeMembers.length} members competing. Play free at thematchpredictor.com`,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        url: pageUrl,
      },
      twitter: {
        card: 'summary_large_image',
        images: [ogImageUrl],
      },
    }
  } catch {
    return {}
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeaguePage({ params, searchParams }) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const { new: isNew, upgraded } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !league) redirect('/dashboard')

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

  const tier       = league.tier ?? 'hobby'
  const isComped   = league.is_comped === true
  const tierLimit  = isComped ? Infinity : (TIER_LIMITS[tier] ?? 6)
  const tierLabel  = TIER_LABELS[tier] ?? 'Hobby'
  const memberCount = members.length
  const atLimit    = isFinite(tierLimit) && memberCount >= tierLimit

  const { data: fixtures } = await adminSupabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  // Build standings OG URL for share button
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
  const [{ data: allPredictions }, { data: allExtras }, { data: masterExtras }] = await Promise.all([
    adminSupabase.from('predictions').select('*').eq('league_id', id),
    adminSupabase.from('extras_predictions').select('*').eq('league_id', id),
    supabase.from('master_extras').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
  ])

  const scored = members.map(m => {
    const userPreds  = (allPredictions || []).filter(p => p.user_id === m.user_id)
    const userExtras = (allExtras || []).find(e => e.user_id === m.user_id) || null
    const { total }  = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
    return { name: m.nickname || m.profiles?.display_name || '?', pts: total }
  })
  scored.sort((a, b) => b.pts - a.pts)

  const ogPayload = {
    leagueName: league.league_name,
    bannerUrl:  league.tier === 'business' && league.banner_url ? league.banner_url : null,
    top5:  scored.slice(0, 5).map((s, i) => ({ rank: i + 1, name: s.name, pts: s.pts })),
    count: members.length,
  }
  const d          = Buffer.from(JSON.stringify(ogPayload)).toString('base64')
  const ogImageUrl = `${siteUrl}/api/og/standings?d=${encodeURIComponent(d)}`
  const pageUrl    = `${siteUrl}/dashboard/league/${id}`

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
        <div className="ml-auto">
          <StandingsShareButton
            ogImageUrl={ogImageUrl}
            pageUrl={pageUrl}
            leagueName={league.league_name}
          />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {league.banner_url && (
          <div className="-mx-6 -mt-10 mb-6">
            <img
              src={league.banner_url}
              alt={`${league.league_name} banner`}
              className="w-full object-cover"
              style={{ maxHeight: 200 }}
            />
          </div>
        )}

        {isNew && (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 mb-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-green-400 mb-1">League Created!</h2>
            <p className="text-gray-400 text-sm mb-4">Share the invite link below with your friends</p>
            <div className="bg-black/20 rounded-xl px-4 py-3 text-sm text-gray-400">
              You're on the <span className="text-white font-medium">Hobby</span> plan — free, up to 6 members.
              Expecting a bigger group?{' '}
              <Link href={`/dashboard/league/${id}/admin`} className="text-yellow-400 hover:text-yellow-300 font-medium">
                Upgrade in League Admin →
              </Link>
            </div>
          </div>
        )}

        {upgraded === 'true' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6 text-center">
            <p className="text-green-400 font-bold text-lg mb-1">🎉 League upgraded!</p>
            <p className="text-gray-400 text-sm">Your new member limit is now active.</p>
          </div>
        )}

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