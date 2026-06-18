// app/api/mini/semi-picks/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { MINI_LOCK_TIME } from '@/lib/worldcup'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Hard lock — reject saves after lock time
  if (new Date() >= MINI_LOCK_TIME) {
    return NextResponse.json({ error: 'Semi-finalist picks are now locked' }, { status: 403 })
  }

  const body = await request.json()
  const { miniLeagueId, teams } = body

  if (!miniLeagueId || !Array.isArray(teams) || teams.length !== 4) {
    return NextResponse.json({ error: 'Exactly 4 teams required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Verify user is a member of this mini league
  const { data: membership } = await adminSupabase
    .from('mini_league_members')
    .select('id')
    .eq('league_id', miniLeagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })
  }

  // Delete existing picks then insert fresh — simpler than upsert for fixed 4-item set
  const { error: deleteError } = await adminSupabase
    .from('mini_semi_picks')
    .delete()
    .eq('user_id', user.id)
    .eq('mini_league_id', miniLeagueId)

  if (deleteError) {
    console.error('semi-picks: delete failed', deleteError)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }

  const rows = teams.map(team => ({
    user_id:        user.id,
    mini_league_id: miniLeagueId,
    team,
  }))

  const { error: insertError } = await adminSupabase
    .from('mini_semi_picks')
    .insert(rows)

  if (insertError) {
    console.error('semi-picks: insert failed', insertError)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}