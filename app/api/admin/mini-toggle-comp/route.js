// app/api/admin/mini-toggle-comp/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { leagueId, comped } = await request.json()
  if (!leagueId || comped == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await createAdminClient()
    .from('mini_leagues').update({ is_comped: comped }).eq('id', leagueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}