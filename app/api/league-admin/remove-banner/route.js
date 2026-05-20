// app/api/league-admin/remove-banner/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const { data: league } = await supabase
    .from('leagues')
    .select('id, admin_id')
    .eq('id', leagueId)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) {
    return NextResponse.json({ error: 'Only the league admin can remove the banner' }, { status: 403 })
  }

  const adminSupabase = createAdminClient()

  // Remove all banner files for this league
  const { data: files } = await adminSupabase.storage
    .from('league-banners')
    .list(leagueId)

  if (files?.length) {
    await adminSupabase.storage
      .from('league-banners')
      .remove(files.map(f => `${leagueId}/${f.name}`))
  }

  await adminSupabase
    .from('leagues')
    .update({ banner_url: null })
    .eq('id', leagueId)

  return NextResponse.json({ success: true })
}