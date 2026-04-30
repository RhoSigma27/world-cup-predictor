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

  // Get all leagues with their admin profile
  const { data: leagues } = await adminSupabase
    .from('leagues')
    .select(`
      id,
      league_name,
      invite_code,
      created_at,
      admin_id,
      profiles (
        display_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  // Get member counts per league
  const { data: memberCounts } = await adminSupabase
    .from('league_members')
    .select('league_id')

  const countMap = {}
  for (const row of memberCounts || []) {
    countMap[row.league_id] = (countMap[row.league_id] || 0) + 1
  }

  // Get all members with profiles for the expand view
  const { data: allMembers } = await adminSupabase
    .from('league_members')
    .select(`
      league_id,
      user_id,
      joined_at,
      profiles (
        display_name,
        email
      )
    `)
    .order('joined_at', { ascending: true })

  // Group members by league
  const membersByLeague = {}
  for (const m of allMembers || []) {
    if (!membersByLeague[m.league_id]) membersByLeague[m.league_id] = []
    membersByLeague[m.league_id].push(m)
  }

  const leaguesData = (leagues || []).map(l => ({
    ...l,
    memberCount: countMap[l.id] || 0,
    members: membersByLeague[l.id] || [],
  }))

  return (
    <LeaguesClient leagues={leaguesData} />
  )
}