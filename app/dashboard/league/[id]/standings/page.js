// app/dashboard/league/[id]/standings/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PointsChart from './PointsChart'
import LeagueLogo from '@/app/components/LeagueLogo'
import StandingsShareButton from './StandingsShareButton'
import { scoreParticipant, scoreKOFixture, buildAllPlayerKOResults, getResult } from '@/lib/scoringEngine'
import { calcGroupTables, buildAnnexMap } from '@/lib/bracketEngine'

export const revalidate = 0

// ─── generateMetadata ────────────────────────────────────────────────────────
// Provides OG image when the standings URL is pasted into WhatsApp / iMessage.
// Lightweight: fetches league info + member names + scores, encodes into OG URL.

export async function generateMetadata({ params }) {
  const { id } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'

  try {
    const supabase = await createServerSupabaseClient()
    const admin = createAdminClient()

    const { data: league } = await supabase
      .from('leagues')
      .select('league_name, tier, banner_url')
      .eq('id', id)
      .single()

    if (!league) return {}

    // Fetch members
    const { data: members } = await admin
      .from('league_members')
      .select('user_id, nickname, profiles(display_name, is_banned)')
      .eq('league_id', id)

    const activeMembers = (members || []).filter(m => !m.profiles?.is_banned)

    // Fetch fixtures + predictions + extras + master extras for scoring
    const [{ data: fixtures }, { data: allPredictions }, { data: allExtras }, { data: masterExtras }] =
      await Promise.all([
        admin.from('fixtures').select('*').order('match_number', { ascending: true }),
        admin.from('predictions').select('*').eq('league_id', id),
        admin.from('extras_predictions').select('*').eq('league_id', id),
        supabase.from('master_extras').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
      ])

    // Score each member
    const scored = activeMembers.map(member => {
      const userPreds  = (allPredictions || []).filter(p => p.user_id === member.user_id)
      const userExtras = (allExtras || []).find(e => e.user_id === member.user_id) || null
      const { total }  = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras?.data ?? masterExtras)
      return {
        name: member.nickname || member.profiles?.display_name || '?',
        pts: total,
      }
    })

    scored.sort((a, b) => b.pts - a.pts)

    const top5 = scored.slice(0, 5).map((s, i) => ({ rank: i + 1, name: s.name, pts: s.pts }))

    const payload = {
      leagueName: league.league_name,
      bannerUrl: league.tier === 'business' && league.banner_url ? league.banner_url : null,
      top5,
      count: activeMembers.length,
    }

    const d = Buffer.from(JSON.stringify(payload)).toString('base64')
    const ogImageUrl = `${siteUrl}/api/og/standings?d=${encodeURIComponent(d)}`
    const pageUrl    = `${siteUrl}/dashboard/league/${id}/standings`

    return {
      title: `${league.league_name} — Standings`,
      description: `Leaderboard for ${league.league_name}. World Cup 2026 Predictor.`,
      openGraph: {
        title: `${league.league_name} — Standings`,
        description: 'World Cup 2026 Predictor leaderboard',
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

export default async function StandingsPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) redirect('/dashboard')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  const { data: members } = await adminSupabase
    .from('league_members')
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

  const { data: masterExtras } = await supabase
    .from('master_extras')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()

  const { data: allPredictions } = await adminSupabase
    .from('predictions')
    .select('*')
    .eq('league_id', id)
    .range(0,9999)

  const { data: allExtras } = await adminSupabase
    .from('extras_predictions')
    .select('*')
    .eq('league_id', id)

  const standings = members?.filter(m => !m.profiles?.is_banned).map(member => {
    const userPreds  = allPredictions?.filter(p => p.user_id === member.user_id) || []
    const userExtras = allExtras?.find(e => e.user_id === member.user_id) || null
    let score
    try {
      score = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
    } catch (err) {
      console.log('SCORING ERROR for', member.nickname || member.profiles?.display_name, err.message, err.stack)
      score = { total: 0, groupPts: 0, koPts: 0, extrasPts: 0 }
    } //const score      = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
    const filled     = userPreds.filter(p => p.predicted_home != null && p.predicted_away != null).length

    return {
      userId:      member.user_id,
      displayName: member.nickname || member.profiles?.display_name,
      isAdmin:     member.user_id === league.admin_id,
      isCurrentUser: member.user_id === user.id,
      starPicks: {
        group: userExtras?.star_pick_group ?? null,
        R32:   userExtras?.star_pick_r32   ?? null,
        R16:   userExtras?.star_pick_r16   ?? null,
        QF:    userExtras?.star_pick_qf    ?? null,
        SF:    userExtras?.star_pick_sf    ?? null,
        FINAL: userExtras?.star_pick_final ?? null,
      },
      filled,
      debugInfo: (member.user_id === '75b0e2f5-9551-4868-a2d4-e6010e647ec3' && user.id === '607c8d37-4fc5-4614-90a2-56708c6c7c1e')
        ? JSON.stringify({ 
            total: allPredictions?.length,
            memberUserId: member.user_id,
            sampleIds: [...new Set((allPredictions || []).map(p => p.user_id))],
            score, userPredsCount: userPreds.length, hasExtras: !!userExtras })
        : null,
      ...score,
    }
  }) || []

  standings.sort((a, b) => b.total - a.total || b.groupPts - a.groupPts)

  let place = 1
  standings.forEach((s, i) => {
    if (i > 0 && s.total !== standings[i - 1].total) place = i + 1
    s.place = place
  })

  const resultsEntered = fixtures?.filter(f => f.home_score != null && f.away_score != null).length || 0

  // ── Chart data ────────────────────────────────────────────────────────────

  const completedFixtures = (fixtures || [])
    .filter(f => f.home_score != null && f.away_score != null)
    .sort((a, b) => a.match_number - b.match_number)

  const playerKOResults = buildAllPlayerKOResults(standings, allPredictions, fixtures || [])

  const chartData = completedFixtures.map(f => {
    const point = { match: f.match_number }
    standings.forEach(s => {
      const pred = allPredictions?.find(p => p.user_id === s.userId && p.fixture_id === f.id)
      if (f.round === 'group') {
        if (!pred || pred.predicted_home == null || pred.predicted_away == null) { point[s.displayName] = 0; return }
        const masterResult = getResult(f.home_score, f.away_score)
        const predResult   = getResult(pred.predicted_home, pred.predicted_away)
        if (masterResult !== predResult) { point[s.displayName] = 0; return }
        let pts = 10
        if (pred.predicted_home === f.home_score && pred.predicted_away === f.away_score) pts += 5
        const sp = s.starPicks?.group ?? null
        if (sp && (f.home_team === sp || f.away_team === sp)) pts *= 2
        point[s.displayName] = pts
      } else {
        let actualHome = f.home_score
        let actualAway = f.away_score
        if (f.penalty_winner && f.home_score === f.away_score) {
          if (f.penalty_winner === f.home_team) actualHome += 1
          else actualAway += 1
        }
        const starRound = f.round === '3RD' ? 'FINAL' : f.round
        const starPick  = s.starPicks?.[starRound] ?? null
        const ukoResults = playerKOResults[s.userId] || {}
        point[s.displayName] = scoreKOFixture(f, actualHome, actualAway, ukoResults, starPick)
      }
    })
    return point
  })

  const cumulativeChart = []
  for (const point of chartData) {
    const cumPoint = { match: point.match }
    const prev = cumulativeChart[cumulativeChart.length - 1]
    standings.forEach(s => {
      cumPoint[s.displayName] = (prev?.[s.displayName] || 0) + (point[s.displayName] || 0)
    })
    cumulativeChart.push(cumPoint)
  }

  // ── OG payload for share button ───────────────────────────────────────────

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
  const ogPayload = {
    leagueName: league.league_name,
    bannerUrl:  league.tier === 'business' && league.banner_url ? league.banner_url : null,
    top5: standings.slice(0, 5).map((s, i) => ({ rank: i + 1, name: s.displayName, pts: s.total })),
    count: standings.length,
  }
  const d            = Buffer.from(JSON.stringify(ogPayload)).toString('base64')
  const ogImageUrl   = `${siteUrl}/api/og/standings?d=${encodeURIComponent(d)}`
  const standingsUrl = `${siteUrl}/dashboard/league/${id}/standings`

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/league/${id}`} className="text-gray-400 hover:text-white text-sm">
            ← {league.league_name}
          </Link>
          <LeagueLogo name={league.league_name} logoUrl={league.logo_url} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{resultsEntered}/104 results in</span>
          {masterExtras?.third_place_override && (
            <span className="text-xs text-amber-400" title="Admin has manually set 3rd place qualifiers">⚠ 3rd override</span>
          )}
          <StandingsShareButton
            ogImageUrl={ogImageUrl}
            pageUrl={standingsUrl}
            leagueName={league.league_name}
          />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🏅 Standings</h1>
          <p className="text-gray-500 text-sm mt-1">{league.league_name} · {members?.length} participants</p>
        </div>

        {resultsEntered === 0 && (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-400">Standings will appear once match results start coming in</p>
            <p className="text-gray-600 text-sm mt-1">The tournament kicks off June 11, 2026</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-yellow-500/5">
                <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase tracking-wider">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => {
                const placeColor = s.place === 1 ? 'text-yellow-400' : s.place === 2 ? 'text-gray-300' : s.place === 3 ? 'text-amber-600' : 'text-gray-500'
                return (
                  <tr key={s.userId}
                    className={`border-b border-gray-800/50 transition-colors
                      ${s.isCurrentUser ? 'bg-yellow-500/5' : 'hover:bg-gray-800/30'}
                      ${s.place === 1 ? 'bg-yellow-500/5' : ''}`}>
                    <td className={`px-4 py-3 font-bold text-lg ${placeColor}`}>
                      {s.place === 1 ? '🥇' : s.place === 2 ? '🥈' : s.place === 3 ? '🥉' : s.place}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
                          {s.displayName?.[0]?.toUpperCase()}
                        </div>
                        <p className="font-medium text-sm">
                          {s.displayName}
                          {s.isCurrentUser && <span className="ml-1 text-xs text-yellow-400">(you)</span>}
                          {s.isAdmin && <span className="ml-1 text-xs text-gray-500">⭐</span>}
                        </p>
                      </div>
                      {s.debugInfo && <pre className="text-xs text-red-400 mt-1">{s.debugInfo}</pre>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xl font-bold text-yellow-400">{s.total}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-500">
          <strong className="text-gray-400">Scoring:</strong> Groups: 10pts result + 5pts score · R32: 10+5 per team · R16: 20+10 · QF/SF: 30+15 · 3rd/Final: 50+25 · Star Pick = 2× · Extras: 50pts closest
        </div>
      </div>

      <PointsChart data={cumulativeChart} players={standings.map(s => s.displayName)} />
    </main>
  )
}