// app/mini/league/[id]/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CopyButton from '@/app/dashboard/league/[id]/CopyButton'
import MiniSemiPicks from './MiniSemiPicks'
import { MINI_LOCK_TIME } from '@/lib/worldcup'

export const revalidate = 0

const TIER_LIMITS = { hobby: 6, enthusiast: 11, fanatic: Infinity, business: Infinity }
const TIER_LABELS = { hobby: 'Hobby', enthusiast: 'Enthusiast', fanatic: 'Fanatic', business: 'Business' }

const KO_ROUNDS = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL']

export default async function MiniLeaguePage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  const isNew = sp?.new === 'true'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  const { data: league, error } = await adminSupabase
    .from('mini_leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !league) redirect('/mini/dashboard')

  const { data: membersRaw } = await adminSupabase
    .from('mini_league_members')
    .select(`
      user_id,
      joined_at,
      nickname,
      profiles (
        display_name,
        is_banned
      )
    `)
    .eq('league_id', id)

  const members = (membersRaw || []).filter(m => !m.profiles?.is_banned)

  const isMember = members.some(m => m.user_id === user.id)
  if (!isMember) redirect(`/mini/join/${league.invite_code}`)

  const isAdmin = league.admin_id === user.id
  const tier = league.tier ?? 'hobby'
  const isComped = league.is_comped === true
  const tierLimit = isComped ? Infinity : (TIER_LIMITS[tier] ?? 6)
  const memberCount = members.length
  const atLimit = isFinite(tierLimit) && memberCount >= tierLimit

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
  const inviteUrl = `${siteUrl}/mini/join/${league.invite_code}`

  const semiPicksOpen = new Date() < MINI_LOCK_TIME

  const { data: userSemiPicks } = await adminSupabase
    .from('mini_semi_picks')
    .select('team')
    .eq('user_id', user.id)
    .eq('mini_league_id', id)

  const pickedTeams = (userSemiPicks || []).map(p => p.team)
  const hasSemiPicks = pickedTeams.length === 4

  const { data: koFixtures } = await adminSupabase
    .from('fixtures')
    .select('*')
    .in('round', KO_ROUNDS)
    .order('match_number', { ascending: true })

  const predictableFixtures = (koFixtures || []).filter(
    f => f.home_team && f.away_team
  )

  const { data: userKoPreds } = await adminSupabase
    .from('mini_ko_predictions')
    .select('fixture_id, predicted_winner')
    .eq('user_id', user.id)
    .eq('mini_league_id', id)

  const koPredMap = Object.fromEntries(
    (userKoPreds || []).map(p => [p.fixture_id, p.predicted_winner])
  )

  const totalPredictable = predictableFixtures.length
  const totalPredicted   = predictableFixtures.filter(f => koPredMap[f.id]).length

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/mini/dashboard" className="text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">🥊</span>
          <span className="font-bold text-yellow-400">{league.league_name}</span>
        </div>
        {isAdmin && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            Admin
          </span>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* New league banner */}
        {isNew && (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 mb-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-green-400 mb-1">League Created!</h2>
            <p className="text-gray-400 text-sm mb-4">
              Share the invite link below with your friends
            </p>
            <div className="bg-black/20 rounded-xl px-4 py-3 text-sm text-gray-400">
              You're on the <span className="text-white font-medium">Hobby</span> plan — free, up to 6 members.
              Expecting a bigger group?{' '}
              <Link href={`/mini/league/${id}/admin`} className="text-yellow-400 hover:text-yellow-300 font-medium">
                Upgrade in League Admin →
              </Link>
            </div>
          </div>
        )}

        {/* Notice board */}
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

        {/* Semi-finalist picks */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">🏆 Semi-Finalist Picks</h2>
            {!semiPicksOpen && (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">Locked</span>
            )}
          </div>

          {semiPicksOpen ? (
            <>
              <p className="text-sm text-gray-400 mb-4">
                Pick 4 teams you think will reach the semi-finals.
                Bonus points: 1 correct = 20pts, 2 = 44pts, 3 = 70pts, 4 = 100pts.
                Locks at half-time of the first knockout match on June 28.
              </p>
              <MiniSemiPicks
                miniLeagueId={id}
                userId={user.id}
                initialPicks={pickedTeams}
                locked={false}
              />
            </>
          ) : hasSemiPicks ? (
            <>
              <p className="text-sm text-gray-500 mb-3">Your picks:</p>
              <div className="flex flex-wrap gap-2">
                {pickedTeams.map(team => (
                  <span
                    key={team}
                    className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm px-3 py-1.5 rounded-full"
                  >
                    {team}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Semi-finalist picks are now locked. You didn't submit picks for this league.
            </p>
          )}
        </div>

        {/* KO Predictions */}
        <div className="mb-6">
          {!semiPicksOpen && totalPredictable > 0 ? (
            <Link
              href={`/mini/league/${id}/predictions`}
              className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-lg text-center transition-colors"
            >
              📋 Knockout Predictions
              <span className="ml-2 text-sm font-normal opacity-75">
                ({totalPredicted}/{totalPredictable} filled)
              </span>
            </Link>
          ) : !semiPicksOpen ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-gray-400 text-sm">
                Knockout fixtures will appear here as teams are confirmed through the bracket.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-gray-500 text-sm">
                🔒 Knockout predictions open after semi-finalist picks lock on June 28.
                Submit your picks above in the meantime.
              </p>
            </div>
          )}
        </div>

        {/* Standings */}
        <Link
          href={`/mini/league/${id}/standings`}
          className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-center transition-colors mb-3"
        >
          🏅 League Standings
        </Link>

        {/* Admin */}
        {isAdmin && (
          <Link
            href={`/mini/league/${id}/admin`}
            className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl text-center transition-colors mb-6 border border-yellow-500/20"
          >
            ⚙️ League Admin
          </Link>
        )}

        {/* Members */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">
            👥 Members ({memberCount}{isFinite(tierLimit) ? `/${tierLimit}` : ''})
          </h2>
          <div className="space-y-2">
            {members.map(m => (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
              >
                <span className="text-sm text-gray-300">
                  {m.nickname || m.profiles?.display_name || '?'}
                  {m.user_id === league.admin_id && (
                    <span className="ml-2 text-xs text-yellow-400">Admin</span>
                  )}
                  {m.user_id === user.id && (
                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">🔗 Invite Friends</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Invite Code</label>
              <div className="mt-1">
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
              {memberCount} member{memberCount !== 1 ? 's' : ''} · {TIER_LABELS[tier]} tier
              {isFinite(tierLimit) ? ` (max ${tierLimit})` : ' (unlimited)'}
              {atLimit && <span className="text-red-400 ml-1 font-medium">· full</span>}
            </span>
            {isAdmin && isFinite(tierLimit) && (
              <Link
                href={`/mini/league/${id}/admin`}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-medium transition-colors flex-shrink-0"
              >
                Want more members? Upgrade →
              </Link>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}