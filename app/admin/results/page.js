import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ResultsClient from './ResultsClient'

export default async function ResultsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) redirect('/dashboard')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  // Fetch the global master_extras row (single global row, no league_id)
  const { data: masterExtrasRows } = await supabase
    .from('master_extras')
    .select('*')
    .limit(1)

  const masterExtras = masterExtrasRows?.[0] ?? null

  return (
    <ResultsClient
      fixtures={fixtures || []}
      masterExtras={masterExtras}
    />
  )
}