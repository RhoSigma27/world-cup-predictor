// app/mini/join/[code]/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

const TIER_LIMITS = { hobby: 6, enthusiast: 11, fanatic: Infinity, business: Infinity }

export default async function MiniJoinByCodePage({ params }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Not signed in — send to auth, return here after
  if (!user) {
    redirect(`/auth/signin?next=/mini/join/${code}`)
  }

  const adminSupabase = createAdminClient()

  // Look up the mini league
  const { data: league } = await adminSupabase
    .from('mini_leagues')
    .select('id, tier, is_comped, league_name, admin_id')
    .eq('invite_code', code.toUpperCase().trim())
    .single()

  if (!league) {
    // Invalid code — send to dashboard with error
    redirect('/mini/dashboard?error=invalid-invite')
  }

  // Already a member — send straight to league page
  const { data: existing } = await adminSupabase
    .from('mini_league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/mini/league/${league.id}`)
  }

  // Check capacity
  const tier = league.tier ?? 'hobby'
  const tierLimit = league.is_comped ? Infinity : (TIER_LIMITS[tier] ?? 6)

  if (isFinite(tierLimit)) {
    const { count } = await adminSupabase
      .from('mini_league_members')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)

    if ((count ?? 0) >= tierLimit) {
      // Full — redirect to dashboard with context
      const params = new URLSearchParams({
        error: 'league-full',
        league_name: league.league_name,
        tier,
      })
      redirect(`/mini/dashboard?${params.toString()}`)
    }
  }

  // Join
  await adminSupabase
    .from('mini_league_members')
    .insert({ league_id: league.id, user_id: user.id })

  redirect(`/mini/league/${league.id}`)
}