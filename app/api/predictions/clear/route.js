// app/api/predictions/clear/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { league_id } = await request.json()
  if (!league_id) return NextResponse.json({ error: 'Missing league_id' }, { status: 400 })

  // Verify user is a member of this league
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })
  }

  const adminSupabase = createAdminClient()

  // Delete all match predictions for this user in this league
  const { error: predictionsError } = await adminSupabase
    .from('predictions')
    .delete()
    .eq('user_id', user.id)
    .eq('league_id', league_id)

  if (predictionsError) {
    console.error('clear predictions error:', predictionsError)
    return NextResponse.json({ error: 'Failed to clear predictions' }, { status: 500 })
  }

  // Reset extras predictions (scores, star picks) — null out all fields
  // Use upsert so it works whether a row exists or not
  const { error: extrasError } = await adminSupabase
    .from('extras_predictions')
    .upsert({
      user_id: user.id,
      league_id,
      predicted_red_cards:  null,
      predicted_total_goals: null,
      star_pick_group: null,
      star_pick_r32:   null,
      star_pick_r16:   null,
      star_pick_qf:    null,
      star_pick_sf:    null,
      star_pick_final: null,
    }, {
      onConflict: 'user_id,league_id',
    })

  if (extrasError) {
    console.error('clear extras error:', extrasError)
    return NextResponse.json({ error: 'Failed to clear extras predictions' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}