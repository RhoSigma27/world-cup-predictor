// app/admin/leagues/page.js
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

  const { data: leagues } = await adminSupabase
    .from('leagues')
    .select('id, league_name, invite_code, created_at, admin_id, logo_url, tier, is_comped, predictions_override_until, ko_reopen_until')
    .order('created_at', { ascending: false })

  // Include score_adjustment so the admin UI can display and edit it
  const { data: allMembers } = await adminSupabase
    .from('league_members')
    .select('league_id, user_id, joined_at, nickname, score_adjustment')
    .order('joined_at', { ascending: true })

  const adminIds   = (leagues || []).map(l => l.admin_id)
  const memberIds  = (allMembers || []).map(m => m.user_id)
  const allUserIds = [...new Set([...adminIds, ...memberIds])]

  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', allUserIds)

  const profileMap = {}
  for (const p of profiles || []) profileMap[p.id] = p

  const countMap = {}
  const membersByLeague = {}
  for (const m of allMembers || []) {
    countMap[m.league_id] = (countMap[m.league_id] || 0) + 1
    if (!membersByLeague[m.league_id]) membersByLeague[m.league_id] = []
    membersByLeague[m.league_id].push({ ...m, profiles: profileMap[m.user_id] || null })
  }

  const { data: nextFixture } = await adminSupabase
    .from('fixtures')
    .select('kickoff_utc')
    .gt('kickoff_utc', new Date().toISOString())
    .order('kickoff_utc', { ascending: true })
    .limit(1)
    .maybeSingle()

  const nextKickoff = nextFixture?.kickoff_utc || null

  const { data: predCounts } = await adminSupabase.rpc('get_prediction_counts')

  const predMap = {}
  for (const row of predCounts || []) {
    predMap[`${row.user_id}_${row.league_id}`] = {
      group: Number(row.group_count),
      ko:    Number(row.ko_count),
    }
  }

  const leaguesData = (leagues || []).map(l => ({
    ...l,
    profiles:    profileMap[l.admin_id] || null,
    memberCount: countMap[l.id] || 0,
    members: (membersByLeague[l.id] || []).map(m => ({
      ...m,
      display_name_effective: m.nickname || profileMap[m.user_id]?.display_name || 'Unknown',
      predGroup:        predMap[`${m.user_id}_${l.id}`]?.group ?? 0,
      predKo:           predMap[`${m.user_id}_${l.id}`]?.ko    ?? 0,
      score_adjustment: m.score_adjustment ?? 0,
    })),
  }))

  return <LeaguesClient leagues={leaguesData} nextKickoff={nextKickoff} />
}