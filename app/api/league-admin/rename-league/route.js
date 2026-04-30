import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId, name } = await request.json()
  if (!leagueId || !name?.trim()) {
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

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('leagues')
    .update({ league_name: name.trim() })
    .eq('id', leagueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}