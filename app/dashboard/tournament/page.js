import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TournamentBracketClient from './TournamentBracketClient'

export default async function TournamentPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  const resultsEntered = fixtures?.filter(f => f.home_score != null && f.away_score != null).length || 0

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
        <span className="text-xs text-gray-500">{resultsEntered}/104 results in</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🏆 Tournament Bracket</h1>
          <p className="text-gray-500 text-sm mt-1">Live results · updates as matches are played</p>
        </div>

        <TournamentBracketClient fixtures={fixtures || []} />
      </div>
    </main>
  )
}