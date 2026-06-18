// app/mini/league/[id]/admin/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import MiniLeagueAdminClient from './MiniLeagueAdminClient'

export const revalidate = 0

export default async function MiniLeagueAdminPage({ params }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const adminSupabase = createAdminClient()

  const { data: league } = await adminSupabase
    .from('mini_leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) redirect('/mini/dashboard')
  if (league.admin_id !== user.id) redirect(`/mini/league/${id}`)

  const { data: membersRaw } = await adminSupabase
    .from('mini_league_members')
    .select(`
      user_id,
      joined_at,
      nickname,
      profiles (
        display_name,
        email,
        is_banned
      )
    `)
    .eq('league_id', id)

  const members = (membersRaw || []).filter(m => !m.profiles?.is_banned)

  return (
    <MiniLeagueAdminClient
      league={league}
      members={members}
      currentUserId={user.id}
    />
  )
}