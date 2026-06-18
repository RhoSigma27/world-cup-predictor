// app/businesses/setup/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SetupClient from './SetupClient'

export const metadata = {
  title: 'Set Up Your Business League — The Match Predictor',
}

export default async function BusinessSetupPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?next=/businesses/setup')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return <SetupClient userId={user.id} displayName={profile?.display_name} />
}