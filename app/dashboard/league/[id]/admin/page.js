import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import LeagueAdminClient from './LeagueAdminClient'

export default async function LeagueAdminPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  // Get league — must be admin
  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !league) redirect('/dashboard')
  if (league.admin_id !== user.id) redirect(`/dashboard/league/${id}`)

  const adminSupabase = createAdminClient()

  // Get all members with profiles (excluding banned)
  const { data: membersRaw } = await adminSupabase
    .from('league_members')
    .select(`
      user_id,
      joined_at,
      profiles (
        display_name,
        email,
        is_banned
      )
    `)
    .eq('league_id', id)
    .order('joined_at', { ascending: true })

  const members = (membersRaw || []).filter(m => !m.profiles?.is_banned)

  return (
    <LeagueAdminClient
      league={league}
      members={members}
      currentUserId={user.id}
    />
  )
}