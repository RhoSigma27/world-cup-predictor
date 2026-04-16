import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function JoinViaLinkPage({ params }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  // If not signed in, redirect to signin with the code saved in URL
  if (!user) {
    redirect(`/auth/signin?invite=${code}`)
  }

  // Find the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (leagueError || !league) {
    redirect('/dashboard?error=invalid-invite')
  }

  // Check if already a member - use maybeSingle() instead of single()
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // Auto-join the league
    const { error: joinError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
      })

    if (joinError) {
      console.error('Join error:', joinError)
      redirect('/dashboard?error=join-failed')
    }
  }

  redirect(`/dashboard/league/${league.id}`)
}