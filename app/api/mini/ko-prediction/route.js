// app/api/mini/ko-prediction/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { MINI_LOCK_TIME, KO_ROUNDS } from '@/lib/worldcup'

const KO_ROUND_SET = new Set(KO_ROUNDS)

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Hard lock
  if (new Date() >= MINI_LOCK_TIME) {
    return NextResponse.json({ error: 'Predictions are locked' }, { status: 403 })
  }

  const body = await request.json()
  const { miniLeagueId, fixtureId, predictedWinner } = body

  if (!miniLeagueId || !fixtureId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Verify membership
  const { data: membership } = await adminSupabase
    .from('mini_league_members')
    .select('id')
    .eq('league_id', miniLeagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })
  }

  // Verify fixture is a KO round and both teams are confirmed
  const { data: fixture } = await adminSupabase
    .from('fixtures')
    .select('id, round, home_team, away_team, home_score, away_score, penalty_winner')
    .eq('id', fixtureId)
    .single()

  if (!fixture || !KO_ROUND_SET.has(fixture.round)) {
    return NextResponse.json({ error: 'Invalid fixture' }, { status: 400 })
  }

  if (!fixture.home_team || !fixture.away_team) {
    return NextResponse.json({ error: 'Teams not yet confirmed for this fixture' }, { status: 400 })
  }

  // Don't allow changing prediction on a completed fixture
  const isComplete = fixture.home_score != null && fixture.away_score != null
  if (isComplete) {
    return NextResponse.json({ error: 'Match already played' }, { status: 403 })
  }

  // Validate predicted winner is one of the two teams (or null to clear)
  if (predictedWinner !== null && predictedWinner !== fixture.home_team && predictedWinner !== fixture.away_team) {
    return NextResponse.json({ error: 'Invalid team selection' }, { status: 400 })
  }

  // Clear prediction if null
  if (predictedWinner === null) {
    await adminSupabase
      .from('mini_ko_predictions')
      .delete()
      .eq('user_id', user.id)
      .eq('mini_league_id', miniLeagueId)
      .eq('fixture_id', fixtureId)

    return NextResponse.json({ success: true })
  }

  // Upsert prediction
  const { error } = await adminSupabase
    .from('mini_ko_predictions')
    .upsert({
      user_id:          user.id,
      mini_league_id:   miniLeagueId,
      fixture_id:       fixtureId,
      predicted_winner: predictedWinner,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,mini_league_id,fixture_id' })

  if (error) {
    console.error('mini ko-prediction upsert failed', error)
    return NextResponse.json({ error: 'Failed to save prediction' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}