// app/mini/league/[id]/predictions/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import MiniPredictionsClient from './MiniPredictionsClient'
import { KO_ROUNDS } from '@/lib/worldcup'

export const revalidate = 0

export default async function MiniPredictionsPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  // Verify membership
  const { data: membership } = await adminSupabase
    .from('mini_league_members')
    .select('id, nickname')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/mini/dashboard')

  // Load league
  const { data: league } = await adminSupabase
    .from('mini_leagues')
    .select('id, league_name, admin_id, tier')
    .eq('id', id)
    .single()

  if (!league) redirect('/mini/dashboard')

  // Load KO fixtures only
  const { data: fixtures } = await adminSupabase
    .from('fixtures')
    .select('*')
    .in('round', KO_ROUNDS)
    .order('match_number', { ascending: true })

  // Load user's existing KO predictions for this mini league
  const { data: existingPredictions } = await adminSupabase
    .from('mini_ko_predictions')
    .select('fixture_id, predicted_winner')
    .eq('mini_league_id', id)
    .eq('user_id', user.id)

  // Load user's semi picks for display
  const { data: semiPicks } = await adminSupabase
    .from('mini_semi_picks')
    .select('team')
    .eq('mini_league_id', id)
    .eq('user_id', user.id)

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <MiniPredictionsClient
      league={league}
      fixtures={fixtures || []}
      existingPredictions={existingPredictions || []}
      semiPicks={(semiPicks || []).map(p => p.team)}
      userId={user.id}
      profile={profile}
      miniLeagueId={id}
    />
  )
}