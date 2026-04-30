import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// GET /api/member-predictions?userId=xxx&leagueId=yyy
// Returns predictions + ko_predictions for a target user in a league.
// Caller must be a member of the same league and predictions must be locked.

const LOCK_DATE = new Date('2026-06-11T19:00:00Z')

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get('userId')
  const leagueId = searchParams.get('leagueId')

  if (!targetUserId || !leagueId) {
    return NextResponse.json({ error: 'Missing userId or leagueId' }, { status: 400 })
  }

  // Only available after lock
  if (new Date() < LOCK_DATE) {
    return NextResponse.json({ error: 'Predictions are not yet locked' }, { status: 403 })
  }

  // Verify the requesting user is authenticated and is a member of this league
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })
  }

  // Verify target user is also in this league
  const adminSupabase = createAdminClient()
  const { data: targetMembership } = await adminSupabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMembership) {
    return NextResponse.json({ error: 'Target user is not a member of this league' }, { status: 404 })
  }

  // Fetch all predictions (group + KO) for target user in this league
  const { data: predictions, error: predError } = await adminSupabase
    .from('predictions')
    .select('fixture_id, predicted_home, predicted_away')
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)

  if (predError) {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }

  // Fetch target user's display name
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('display_name')
    .eq('id', targetUserId)
    .single()

  return NextResponse.json({
    predictions: predictions || [],
    displayName: profile?.display_name || 'Unknown',
  })
}