import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function DELETE(request) {
  // Verify superadmin
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

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Delete in order to respect foreign key constraints:
  // 1. predictions
  await adminSupabase.from('predictions').delete().eq('league_id', leagueId)
  // 2. extras_predictions
  await adminSupabase.from('extras_predictions').delete().eq('league_id', leagueId)
  // 3. star_picks (if separate table — safe to attempt)
  await adminSupabase.from('star_picks').delete().eq('league_id', leagueId)
  // 4. league_members
  await adminSupabase.from('league_members').delete().eq('league_id', leagueId)
  // 5. finally the league itself
  const { error } = await adminSupabase.from('leagues').delete().eq('id', leagueId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}