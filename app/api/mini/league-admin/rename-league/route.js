// ─────────────────────────────────────────────────────────────────────────────
// app/api/mini/league-admin/rename-league/route.js
// ─────────────────────────────────────────────────────────────────────────────
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

async function verifyAdmin(supabase, adminSupabase, leagueId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorised', status: 401 }
  const { data: league } = await adminSupabase
    .from('mini_leagues').select('admin_id').eq('id', leagueId).single()
  if (!league) return { error: 'League not found', status: 404 }
  if (league.admin_id !== user.id) return { error: 'Forbidden', status: 403 }
  return { user }
}

// RENAME LEAGUE
export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminClient()
  const { leagueId, name } = await request.json()
  if (!leagueId || !name?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const auth = await verifyAdmin(supabase, adminSupabase, leagueId)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { error } = await adminSupabase
    .from('mini_leagues').update({ league_name: name.trim() }).eq('id', leagueId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}