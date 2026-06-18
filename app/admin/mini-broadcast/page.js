// app/admin/mini-broadcast/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MiniBroadcastClient from './MiniBroadcastClient'

export default async function AdminMiniBroadcastPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!profile?.is_superadmin) redirect('/dashboard')

  return <MiniBroadcastClient />
}