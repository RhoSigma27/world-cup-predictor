import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import LeaguesClient from './LeaguesClient'

export default async function AdminLeaguesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) redirect('/dashboard')

  const adminSupabase = createAdminClient()

  // Get all leagues
  const { data: leagues } = await adminSupabase
    .from('leagues')
    .select('id, league_name, invite_code, created_at, admin_id, logo_url, tier, is_comped, predictions_override_until') 
    .order('created_at', { ascending: false })

  // Get all members
  const { data: allMembers } = await adminSupabase
    .from('league_members')
    .select('league_id, user_id, joined_at, nickname')
    .order('joined_at', { ascending: true })

  // Collect all unique user IDs (admins + members)
  const adminIds = (leagues || []).map(l => l.admin_id)
  const memberIds = (allMembers || []).map(m => m.user_id)
  const allUserIds = [...new Set([...adminIds, ...memberIds])]

  // Fetch all profiles in one query
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', allUserIds)

  const profileMap = {}
  for (const p of profiles || []) {
    profileMap[p.id] = p
  }

  // Member counts and grouping
  const countMap = {}
  const membersByLeague = {}
  for (const m of allMembers || []) {
    countMap[m.league_id] = (countMap[m.league_id] || 0) + 1
    if (!membersByLeague[m.league_id]) membersByLeague[m.league_id] = []
    membersByLeague[m.league_id].push({
      ...m,
      profiles: profileMap[m.user_id] || null,
    })
  }

  // Fetch prediction counts via RPC (avoids PostgREST 1000-row limit)
  const { data: predCounts } = await adminSupabase
    .rpc('get_prediction_counts')

  const predMap = {}
  for (const row of predCounts || []) {
    predMap[`${row.user_id}_${row.league_id}`] = {
      group: Number(row.group_count),
      ko: Number(row.ko_count),
    }
  }

  const leaguesData = (leagues || []).map(l => ({
    ...l,
    profiles: profileMap[l.admin_id] || null,
    memberCount: countMap[l.id] || 0,
    members: (membersByLeague[l.id] || []).map(m => ({
      ...m,
      display_name_effective: m.nickname || profileMap[m.user_id]?.display_name || 'Unknown',
      predGroup: predMap[`${m.user_id}_${l.id}`]?.group ?? 0,
      predKo:    predMap[`${m.user_id}_${l.id}`]?.ko    ?? 0,
    })),
  }))

  return (
    <LeaguesClient leagues={leaguesData} />
  )
}