import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const TIER_LIMITS = { hobby: 6, enthusiast: 11, fanatic: Infinity, business: Infinity }

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { inviteCode } = await request.json()
  if (!inviteCode) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Find league by invite code
  const { data: league, error: leagueError } = await adminSupabase
    .from('leagues')
    .select('id, tier, is_comped')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found. Check the invite code and try again.' }, { status: 404 })
  }

  // Already a member? Just send them there — no limit check needed.
  const { data: existing } = await adminSupabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, leagueId: league.id })
  }

  // Check capacity for new joiners only
  const tier = league.tier ?? 'hobby'
  const tierLimit = league.is_comped ? Infinity : (TIER_LIMITS[tier] ?? 6)

  if (isFinite(tierLimit)) {
    const { count } = await adminSupabase
      .from('league_members')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)

    if ((count ?? 0) >= tierLimit) {
      return NextResponse.json({
        error: `This league is full (${count}/${tierLimit} members). Ask the league admin to upgrade their plan for more spots.`
      }, { status: 403 })
    }
  }

  // Join
  const { error: joinError } = await adminSupabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id })

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, leagueId: league.id })
}