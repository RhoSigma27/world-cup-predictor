import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId, userId } = await request.json()
  if (!leagueId || !userId) {
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

  // Cannot remove yourself
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Remove from league_members only — keep predictions intact so they can rejoin
  const { error } = await adminSupabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}