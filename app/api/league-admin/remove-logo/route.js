// app/api/league-admin/remove-logo/route.js
//
// POST /api/league-admin/remove-logo
// Body: { leagueId }
// Auth: must be league admin or superadmin

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  const adminSupabase = createAdminClient()

  const { data: league } = await adminSupabase
    .from('leagues')
    .select('id, admin_id')
    .eq('id', leagueId)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const isLeagueAdmin = league.admin_id === user.id
  const isSuperadmin = profile?.is_superadmin === true

  if (!isLeagueAdmin && !isSuperadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await adminSupabase
    .from('leagues')
    .update({ logo_url: null })
    .eq('id', leagueId)

  if (error) {
    console.error('Remove logo error:', error)
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}