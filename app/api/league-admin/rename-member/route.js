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

  // Verify caller is the league admin or superadmin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  const { data: league } = await supabase
    .from('leagues')
    .select('admin_id')
    .eq('id', leagueId)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const isLeagueAdmin = league.admin_id === user.id
  const isSuperadmin = profile?.is_superadmin === true

  if (!isLeagueAdmin && !isSuperadmin) {
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

  // ── CHANGED: update nickname on league_members (scoped to this league)
  // rather than display_name on profiles (which would affect all leagues)
  const { error } = await adminSupabase
    .from('league_members')
    .update({ nickname: name.trim() })
    .eq('league_id', leagueId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}