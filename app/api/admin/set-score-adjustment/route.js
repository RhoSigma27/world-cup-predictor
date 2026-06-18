// app/api/admin/set-score-adjustment/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Superadmin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueId, userId, adjustment } = await request.json()

  if (!leagueId || !userId || adjustment == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!Number.isInteger(adjustment)) {
    return NextResponse.json({ error: 'Adjustment must be an integer' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('league_members')
    .update({ score_adjustment: adjustment })
    .eq('league_id', leagueId)
    .eq('user_id', userId)

  if (error) {
    console.error('set-score-adjustment failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}