// app/dashboard/profile/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Main game league memberships with nicknames
  const { data: memberships } = await supabase
    .from('league_members')
    .select(`
      league_id,
      nickname,
      leagues (
        id,
        league_name
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  // Mini-game league memberships with nicknames
  const { data: miniMemberships } = await supabase
    .from('mini_league_members')
    .select(`
      league_id,
      nickname,
      mini_leagues (
        id,
        league_name
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
        <span className="font-bold text-yellow-400">My Profile</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10">
        <ProfileClient
          userId={user.id}
          email={user.email}
          currentDisplayName={profile?.display_name ?? ''}
          memberships={memberships || []}
          miniMemberships={miniMemberships || []}
        />
      </div>
    </main>
  )
}