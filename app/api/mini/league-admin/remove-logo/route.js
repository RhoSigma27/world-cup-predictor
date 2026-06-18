// app/api/mini/league-admin/remove-logo/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from('mini_leagues').select('admin_id, logo_url').eq('id', leagueId).single()
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Remove from storage if we have a path
  if (league.logo_url) {
    const urlPath = new URL(league.logo_url).pathname
    const storagePath = urlPath.split('/league-logos/')[1]
    if (storagePath) {
      await adminSupabase.storage.from('league-logos').remove([`mini-logos/${storagePath.split('mini-logos/')[1] || storagePath}`])
    }
  }

  const { error } = await adminSupabase
    .from('mini_leagues').update({ logo_url: null }).eq('id', leagueId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}