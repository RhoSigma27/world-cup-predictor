// app/api/predictions/import/route.js
//
// POST /api/predictions/import
// Body: { fromLeagueId, toLeagueId }
// Auth: must be a member of both leagues
// Copies match score predictions only (not star picks or extras)
// Only allowed when the target league has zero predictions

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { fromLeagueId, toLeagueId } = await request.json()
    if (!fromLeagueId || !toLeagueId) {
      return NextResponse.json({ error: 'Missing fromLeagueId or toLeagueId' }, { status: 400 })
    }
    if (fromLeagueId === toLeagueId) {
      return NextResponse.json({ error: 'Cannot import from the same league' }, { status: 400 })
    }

    // Verify user is a member of both leagues
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id)
      .in('league_id', [fromLeagueId, toLeagueId])

    const memberLeagueIds = (memberships || []).map(m => m.league_id)
    if (!memberLeagueIds.includes(fromLeagueId) || !memberLeagueIds.includes(toLeagueId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Safety check: target league must have zero predictions
    const { data: existingPreds } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', user.id)
      .eq('league_id', toLeagueId)
      .not('predicted_home', 'is', null)
      .not('predicted_away', 'is', null)
      .limit(1)

    if (existingPreds?.length > 0) {
      return NextResponse.json({
        error: 'Target league already has predictions — import is only allowed into an empty prediction set'
      }, { status: 409 })
    }

    // Fetch source predictions
    const { data: sourcePreds, error: fetchError } = await supabase
      .from('predictions')
      .select('fixture_id, predicted_home, predicted_away')
      .eq('user_id', user.id)
      .eq('league_id', fromLeagueId)
      .not('predicted_home', 'is', null)
      .not('predicted_away', 'is', null)

    if (fetchError) throw fetchError
    if (!sourcePreds?.length) {
      return NextResponse.json({ error: 'No predictions found in source league' }, { status: 404 })
    }

    // Build upsert payload for target league
    const now = new Date().toISOString()
    const toInsert = sourcePreds.map(p => ({
      user_id: user.id,
      league_id: toLeagueId,
      fixture_id: p.fixture_id,
      predicted_home: p.predicted_home,
      predicted_away: p.predicted_away,
      updated_at: now,
    }))

    const { error: upsertError } = await supabase
      .from('predictions')
      .upsert(toInsert, { onConflict: 'user_id,league_id,fixture_id' })

    if (upsertError) throw upsertError

    return NextResponse.json({ success: true, imported: toInsert.length })
  } catch (err) {
    console.error('Import predictions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}