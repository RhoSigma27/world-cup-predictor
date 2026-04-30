import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId, userId, name } = await request.json()
  if (!leagueId || !userId || !name?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify caller is the league admin
  const { data: league } = await supabase
    .from('leagues')
    .select('admin_id')
    .eq('id', leagueId)
    .single()

  if (!league || league.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify target user is in this league
  const adminSupabase = createAdminClient()
  const { data: membership } = await adminSupabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single()

  if (!membership) return NextResponse.json({ error: 'User not in league' }, { status: 404 })

  const { error } = await adminSupabase
    .from('profiles')
    .update({ display_name: name.trim() })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}