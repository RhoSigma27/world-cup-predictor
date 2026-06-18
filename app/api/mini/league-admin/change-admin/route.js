// app/api/mini/league-admin/change-admin/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId, userId } = await request.json()
  if (!leagueId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Already admin' }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from('mini_leagues').select('admin_id').eq('id', leagueId).single()
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify new admin is a member
  const { data: membership } = await adminSupabase
    .from('mini_league_members').select('id')
    .eq('league_id', leagueId).eq('user_id', userId).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'User is not a member of this league' }, { status: 400 })

  const { error } = await adminSupabase
    .from('mini_leagues').update({ admin_id: userId }).eq('id', leagueId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}