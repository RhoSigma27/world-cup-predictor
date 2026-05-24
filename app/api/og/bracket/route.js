// app/api/og/bracket/route.js
// Test 3: add all imports + Supabase calls
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId   = searchParams.get('userId')
  const leagueId = searchParams.get('leagueId')

  const admin = createAdminClient()

  const [
    { data: profile },
    { data: fixtures },
    { data: predictions },
  ] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', userId).single(),
    admin.from('fixtures').select('*').order('match_number', { ascending: true }),
    admin.from('predictions').select('fixture_id,predicted_home,predicted_away')
      .eq('user_id', userId).eq('league_id', leagueId),
  ])

  const name = profile?.display_name || 'Player'
  const fixtureCount = fixtures?.length ?? 0
  const predCount    = predictions?.length ?? 0

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <span style={{ fontSize: '36px', color: '#ca8a04', fontWeight: 800 }}>All imports + DB OK</span>
        <span style={{ fontSize: '20px', color: 'white' }}>User: {name}</span>
        <span style={{ fontSize: '20px', color: '#88aed0' }}>Fixtures: {fixtureCount} · Predictions: {predCount}</span>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}