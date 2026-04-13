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

  return (
    <PredictionsClient
      league={league}
      fixtures={fixtures || []}
      existingPredictions={existingPredictions || []}
      extrasPrediction={extrasPrediction || null}
      userId={user.id}
      profile={profile}
      leagueId={id}
    />
  )
}