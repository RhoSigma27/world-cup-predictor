// app/api/mini/league-admin/remove-member/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId, userId } = await request.json()
  if (!leagueId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from('mini_leagues').select('admin_id').eq('id', leagueId).single()
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const { error } = await adminSupabase
    .from('mini_league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}