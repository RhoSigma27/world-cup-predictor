// app/api/admin/mini-delete-league/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function DELETE(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Delete in dependency order — members and picks first, then league
  await adminSupabase.from('mini_ko_predictions').delete().eq('mini_league_id', leagueId)
  await adminSupabase.from('mini_semi_picks').delete().eq('mini_league_id', leagueId)
  await adminSupabase.from('mini_league_members').delete().eq('league_id', leagueId)
  const { error } = await adminSupabase.from('mini_leagues').delete().eq('id', leagueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}