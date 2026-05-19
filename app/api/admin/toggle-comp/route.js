// app/api/admin/toggle-comp/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Superadmin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leagueId, comped } = await request.json()
  if (!leagueId || typeof comped !== 'boolean') {
    return NextResponse.json({ error: 'Missing leagueId or comped' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('leagues')
    .update({ is_comped: comped })
    .eq('id', leagueId)

  if (error) {
    console.error('toggle-comp error:', error)
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, is_comped: comped })
}