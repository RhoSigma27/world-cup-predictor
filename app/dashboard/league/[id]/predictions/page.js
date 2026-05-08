import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PredictionsClient from './PredictionsClient'

export default async function PredictionsPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  // Check user is a member of this league
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Get league details
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  // Get all fixtures
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  // Get user's existing predictions for this league
  const { data: existingPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('league_id', id)
    .eq('user_id', user.id)

  // Get user's extras prediction
  const { data: extrasPrediction } = await supabase
    .from('extras_predictions')
    .select('*')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Get fixture odds — build a map of fixture_id → odds
  const { data: oddsRows } = await supabase
    .from('fixture_odds')
    .select('fixture_id, home_prob, draw_prob, away_prob')

  const fixtureOdds = {}
  for (const row of oddsRows || []) {
    fixtureOdds[row.fixture_id] = {
      home_prob: row.home_prob,
      draw_prob: row.draw_prob,
      away_prob: row.away_prob,
    }
  }

  // ── NEW: import source leagues ─────────────────────────────────────────────
  // Only bother fetching if this league has no predictions yet
  const currentPredCount = (existingPredictions || []).filter(
    p => p.predicted_home != null && p.predicted_away != null
  ).length

  let importableLeagues = []
  if (currentPredCount === 0) {
    // Find other leagues this user has predictions in
    const { data: otherMemberships } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, league_name)')
      .eq('user_id', user.id)
      .neq('league_id', id)

    if (otherMemberships?.length) {
      const otherLeagueIds = otherMemberships.map(m => m.league_id)

      // Count filled predictions per league
      const { data: otherPreds } = await supabase
        .from('predictions')
        .select('league_id')
        .eq('user_id', user.id)
        .in('league_id', otherLeagueIds)
        .not('predicted_home', 'is', null)
        .not('predicted_away', 'is', null)

      // Build count map
      const countMap = {}
      for (const p of otherPreds || []) {
        countMap[p.league_id] = (countMap[p.league_id] || 0) + 1
      }

      // Only include leagues that have at least 1 prediction
      importableLeagues = otherMemberships
        .filter(m => (countMap[m.league_id] || 0) > 0)
        .map(m => ({
          id: m.league_id,
          name: m.leagues?.league_name || 'Unknown league',
          predCount: countMap[m.league_id] || 0,
        }))
        .sort((a, b) => b.predCount - a.predCount) // most complete first
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PredictionsClient
      league={league}
      fixtures={fixtures || []}
      existingPredictions={existingPredictions || []}
      extrasPrediction={extrasPrediction || null}
      userId={user.id}
      profile={profile}
      leagueId={id}
      fixtureOdds={fixtureOdds}
      importableLeagues={importableLeagues}
    />
  )
}