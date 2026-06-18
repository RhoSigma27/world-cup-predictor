// app/admin/mini-leagues/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import MiniLeaguesClient from './MiniLeaguesClient'

export default async function AdminMiniLeaguesPage() {
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
    .from('mini_leagues')
    .select('id, league_name, invite_code, created_at, admin_id, logo_url, tier, is_comped')
    .order('created_at', { ascending: false })

  const { data: allMembers } = await adminSupabase
    .from('mini_league_members')
    .select('league_id, user_id, joined_at, nickname')
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
    membersByLeague[m.league_id].push({
      ...m,
      profiles: profileMap[m.user_id] || null,
    })
  }

  const leaguesData = (leagues || []).map(l => ({
    ...l,
    profiles:    profileMap[l.admin_id] || null,
    memberCount: countMap[l.id] || 0,
    members: (membersByLeague[l.id] || []).map(m => ({
      ...m,
      display_name_effective: m.nickname || profileMap[m.user_id]?.display_name || 'Unknown',
    })),
  }))

  return <MiniLeaguesClient leagues={leaguesData} />
}