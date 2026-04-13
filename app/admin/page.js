import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
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
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
          <p className="text-gray-400">Welcome, {profile.display_name}. Site-wide controls.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/admin/results"
            className="block bg-gray-900 border border-gray-800 hover:border-yellow-500 rounded-2xl p-5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">📡 Enter Match Results</h2>
                <p className="text-gray-500 text-sm">
                  Update real scores for all 104 fixtures — applies to every league
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}