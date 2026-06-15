import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueId, overrideUntil } = await request.json()
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('leagues')
    .update({ predictions_override_until: overrideUntil || null })
    .eq('id', leagueId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  let seeded = 0
  // Only seed when setting (not clearing) a future override
  if (overrideUntil && new Date(overrideUntil) > new Date()) {
    seeded = await seedPastResults(adminSupabase, leagueId)
  }

  return NextResponse.json({ success: true, seeded })
}

async function seedPastResults(adminSupabase, leagueId) {
  const now = new Date().toISOString()

  // Past fixtures with a recorded result
  const { data: pastFixtures } = await adminSupabase
    .from('fixtures')
    .select('id, round, home_score, away_score, penalty_winner, home_team, away_team')
    .lt('kickoff_utc', now)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  if (!pastFixtures?.length) return 0
  const fixtureIds = pastFixtures.map(f => f.id)

  // League members
  const { data: members } = await adminSupabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members?.length) return 0

  // Existing predictions for these fixtures in this league
  const { data: existing } = await adminSupabase
    .from('predictions')
    .select('user_id, fixture_id, predicted_home, predicted_away')
    .eq('league_id', leagueId)
    .in('fixture_id', fixtureIds)

  const have = new Set(
    (existing || [])
      .filter(p => p.predicted_home != null && p.predicted_away != null)
      .map(p => `${p.user_id}_${p.fixture_id}`)
  )

  const rows = []
  for (const member of members) {
    for (const f of pastFixtures) {
      const key = `${member.user_id}_${f.id}`
      if (have.has(key)) continue

      let predicted_home = f.home_score
      let predicted_away = f.away_score

      // KO fixtures can't be a draw — apply penalty winner +1 (matches the UI convention)
      if (f.round !== 'group' && predicted_home === predicted_away && f.penalty_winner) {
        if (f.penalty_winner === f.home_team) predicted_home += 1
        else if (f.penalty_winner === f.away_team) predicted_away += 1
      }

      rows.push({
        user_id: member.user_id,
        league_id: leagueId,
        fixture_id: f.id,
        predicted_home,
        predicted_away,
        updated_at: now,
      })
    }
  }

  if (!rows.length) return 0

  const { error } = await adminSupabase
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,league_id,fixture_id' })

  return error ? 0 : rows.length
}