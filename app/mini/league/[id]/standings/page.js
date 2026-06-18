// app/mini/league/[id]/standings/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { scoreMiniLeague } from '@/lib/miniScoringEngine'
import { KO_ROUNDS, MINI_SEMI_BONUS, MINI_KO_POINTS } from '@/lib/worldcup'

export const revalidate = 0

// Derive display tables from lib constants so they never drift
const SEMI_BONUS_ROWS = Object.entries(MINI_SEMI_BONUS).map(([correct, pts]) => ({
  correct: Number(correct),
  pts,
}))

const KO_POINTS_ROWS = [
  { label: 'Round of 32', round: 'R32'   },
  { label: 'Round of 16', round: 'R16'   },
  { label: 'QF / Semis',  round: 'QF'    },
  { label: '3rd / Final', round: 'FINAL' },
].map(r => ({ ...r, pts: MINI_KO_POINTS[r.round] }))

// Total possible KO fixtures: 32+16+8+4+2+1 = 63
const TOTAL_KO_FIXTURES = 63

export default async function MiniStandingsPage({ params }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  const { data: league } = await adminSupabase
    .from('mini_leagues')
    .select('id, league_name, admin_id, invite_code')
    .eq('id', id)
    .single()

  if (!league) redirect('/mini/dashboard')

  // Verify membership
  const { data: membership } = await adminSupabase
    .from('mini_league_members')
    .select('id')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect(`/mini/join/${league.invite_code}`)

  // Load members
  const { data: membersRaw } = await adminSupabase
    .from('mini_league_members')
    .select(`
      user_id,
      nickname,
      profiles (
        display_name,
        is_banned
      )
    `)
    .eq('league_id', id)

  const members = (membersRaw || []).filter(m => !m.profiles?.is_banned)

  // Load scoring data in parallel
  const [
    { data: allSemiPicks },
    { data: allKoPreds },
    { data: koFixtures },
  ] = await Promise.all([
    adminSupabase
      .from('mini_semi_picks')
      .select('user_id, team')
      .eq('mini_league_id', id),
    adminSupabase
      .from('mini_ko_predictions')
      .select('user_id, fixture_id, predicted_winner')
      .eq('mini_league_id', id),
    adminSupabase
      .from('fixtures')
      .select('*')
      .in('round', KO_ROUNDS)
      .order('match_number', { ascending: true }),
  ])

  const standings = scoreMiniLeague(
    members,
    allSemiPicks || [],
    allKoPreds   || [],
    koFixtures   || [],
  )

  const completedFixtures = (koFixtures || []).filter(
    f => f.home_score != null && f.away_score != null
  ).length

  const currentUserRow = standings.find(s => s.userId === user.id)

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/mini/league/${id}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← {league.league_name}
        </Link>
        <span className="font-bold text-yellow-400">Standings</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">🏅 League Standings</h1>
          <p className="text-gray-400 text-sm">
            {completedFixtures} of {TOTAL_KO_FIXTURES} knockout matches played
          </p>
        </div>

        {/* Current user summary */}
        {currentUserRow && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8">
            <p className="text-xs text-yellow-400 uppercase tracking-wider font-bold mb-3">Your score</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{currentUserRow.total}</div>
                <div className="text-xs text-gray-400 mt-1">Total pts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{currentUserRow.semiBonus}</div>
                <div className="text-xs text-gray-400 mt-1">Semi bonus</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{currentUserRow.koPoints}</div>
                <div className="text-xs text-gray-400 mt-1">KO pts</div>
              </div>
            </div>
            {currentUserRow.correctSemiPicks > 0 && (
              <p className="text-xs text-gray-500 text-center mt-3">
                {currentUserRow.correctSemiPicks}/4 semi-finalists correct
              </p>
            )}
          </div>
        )}

        {/* Standings table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
          <div className="grid grid-cols-[32px_1fr_64px_64px_64px] items-center px-4 py-3 border-b border-gray-700 bg-yellow-500/10">
            <span className="text-xs text-gray-500">#</span>
            <span className="text-xs text-gray-500">Player</span>
            <span className="text-xs text-gray-500 text-center">Semi</span>
            <span className="text-xs text-gray-500 text-center">KO</span>
            <span className="text-xs font-bold text-yellow-400 text-center">Total</span>
          </div>

          {standings.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500 text-sm">
              No predictions yet — standings will appear once members make picks.
            </div>
          ) : (
            standings.map((row, i) => {
              const isCurrentUser = row.userId === user.id
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

              return (
                <div
                  key={row.userId}
                  className={`
                    grid grid-cols-[32px_1fr_64px_64px_64px] items-center px-4 py-4
                    ${i < standings.length - 1 ? 'border-b border-gray-800' : ''}
                    ${isCurrentUser ? 'bg-yellow-500/5' : ''}
                  `}
                >
                  <span className="text-sm text-gray-500">
                    {medal || <span className="text-gray-600">{i + 1}</span>}
                  </span>
                  <span className={`text-sm truncate ${isCurrentUser ? 'text-yellow-300 font-medium' : 'text-white'}`}>
                    {row.name}
                    {isCurrentUser && <span className="text-gray-500 ml-1 text-xs">(you)</span>}
                  </span>
                  <span className="text-sm text-yellow-400 text-center">{row.semiBonus}</span>
                  <span className="text-sm text-green-400 text-center">{row.koPoints}</span>
                  <span className="text-sm font-bold text-white text-center">{row.total}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Scoring reference */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 bg-yellow-500/10">
            <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
              Scoring reference
            </h3>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
            <div className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">
                🏆 Semi-Finalist Bonus
              </p>
              <div className="space-y-2">
                {SEMI_BONUS_ROWS.map(row => (
                  <div key={row.correct} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{row.correct} correct</span>
                    <span className="text-yellow-400 font-bold">{row.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">
                📋 Knockout Predictions
              </p>
              <div className="space-y-2">
                {KO_POINTS_ROWS.map(row => (
                  <div key={row.round} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="text-yellow-400 font-bold">{row.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}