import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  
  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('*')
    .limit(5)

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>World Cup Predictor</h1>
      <h2>Supabase Connection Test</h2>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      ) : (
        <div>
          <p style={{ color: 'green' }}>✅ Connected to Supabase successfully!</p>
          <p>First 5 fixtures loaded from database:</p>
          <ul>
            {fixtures.map(f => (
              <li key={f.id}>
                Match {f.match_number}: {f.home_team} vs {f.away_team} — {f.venue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}