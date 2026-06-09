// app/admin/broadcast/page.js

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BroadcastClient from './BroadcastClient'

export const metadata = {
  title: 'Broadcast Email — Admin',
}

export default async function BroadcastPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin, display_name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-yellow-400">Site Admin</span>
        </div>
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← Admin panel
        </Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">📣 Broadcast Email</h1>
          <p className="text-gray-400 text-sm">
            Send a message to league admins. Each admin receives one email regardless of how many leagues they run.
          </p>
        </div>

        <BroadcastClient />
      </div>
    </main>
  )
}