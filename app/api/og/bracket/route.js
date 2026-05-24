// app/api/og/bracket/route.js
// Debug version — returns visible error text if something throws
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('userId')
    const leagueId = searchParams.get('leagueId')
    if (!userId || !leagueId) return new Response('Missing params', { status: 400 })

    const admin = createAdminClient()

    const [
      { data: profile },
      { data: membership },
      { data: fixtures },
      { data: predictions },
    ] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', userId).single(),
      admin.from('league_members').select('nickname').eq('league_id', leagueId).eq('user_id', userId).single(),
      admin.from('fixtures').select('*').order('match_number', { ascending: true }),
      admin.from('predictions').select('fixture_id,predicted_home,predicted_away')
        .eq('user_id', userId).eq('league_id', leagueId),
    ])

    const name = membership?.nickname || profile?.display_name || 'Player'

    const predMap = {}
    for (const p of predictions || []) predMap[p.fixture_id] = p
    const byNum = {}
    for (const f of fixtures || []) if (f.match_number) byNum[f.match_number] = f

    const tables   = calcGroupTables(predMap, fixtures || [])
    const annexMap = buildAnnexMap(tables)
    const res = (slot, num) => resolveSlot(slot, num, tables, annexMap, predMap, byNum)

    const buildRound = (roundCode) =>
      (fixtures || [])
        .filter(f => f.round === roundCode)
        .sort((a, b) => a.match_number - b.match_number)
        .map(f => ({
          t1: res(f.slot1, f.match_number) ?? 'TBD',
          t2: res(f.slot2, f.match_number) ?? 'TBD',
          w:  (() => {
            const pred = normalisePred(predMap[f.id])
            if (!pred || pred.home == null || pred.away == null) return null
            if (pred.home > pred.away) return res(f.slot1, f.match_number)
            if (pred.away > pred.home) return res(f.slot2, f.match_number)
            return null
          })()
        }))

    const r16   = buildRound('R16')
    const qf    = buildRound('QF')
    const sf    = buildRound('SF')
    const finalR = buildRound('FINAL')
    const fin   = finalR[0] ?? { t1: 'TBD', t2: 'TBD', w: null }
    const champ = fin.w

    // Render a minimal test image first to confirm rendering works
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: '#060e1f',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #ca8a04', paddingBottom: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>{name}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#ca8a04' }}>thematchpredictor.com</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px' }}>
              <span style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '1px' }}>ROUND OF 16</span>
              {r16.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ background: m.w === m.t1 ? '#1c1400' : '#0b1525', borderLeft: m.w === m.t1 ? '2px solid #ca8a04' : '2px solid #1a3050', padding: '3px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '9px', color: m.w === m.t1 ? '#fde68a' : '#607a95' }}>{m.t1}</span>
                  </div>
                  <div style={{ background: m.w === m.t2 ? '#1c1400' : '#0b1525', borderLeft: m.w === m.t2 ? '2px solid #ca8a04' : '2px solid #1a3050', padding: '3px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '9px', color: m.w === m.t2 ? '#fde68a' : '#607a95' }}>{m.t2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px' }}>
              <span style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '1px' }}>QF</span>
              {qf.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ background: '#0b1525', borderLeft: '2px solid #1a3050', padding: '5px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#607a95' }}>{m.t1}</span>
                  </div>
                  <div style={{ background: m.w === m.t2 ? '#1c1400' : '#0b1525', borderLeft: m.w === m.t2 ? '2px solid #ca8a04' : '2px solid #1a3050', padding: '5px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '10px', color: m.w === m.t2 ? '#fde68a' : '#607a95' }}>{m.t2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '160px', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '1px' }}>SF</span>
              {sf.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ background: '#0b1525', borderLeft: '2px solid #1a3050', padding: '7px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#607a95' }}>{m.t1}</span>
                  </div>
                  <div style={{ background: m.w === m.t2 ? '#1c1400' : '#0b1525', borderLeft: m.w === m.t2 ? '2px solid #ca8a04' : '2px solid #1a3050', padding: '7px 6px', borderRadius: '2px' }}>
                    <span style={{ fontSize: '11px', color: m.w === m.t2 ? '#fde68a' : '#607a95' }}>{m.t2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '140px', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '1px' }}>FINAL</span>
              <div style={{ background: '#1c1400', borderLeft: '3px solid #ca8a04', padding: '10px 8px', borderRadius: '3px' }}>
                <span style={{ fontSize: '13px', color: '#fde68a', fontWeight: 700 }}>{fin.t1}</span>
              </div>
              <div style={{ background: '#0e1e35', borderLeft: '2px solid #2a5080', padding: '10px 8px', borderRadius: '3px' }}>
                <span style={{ fontSize: '13px', color: '#88aed0' }}>{fin.t2}</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', borderLeft: '1px solid #111f33' }}>
              <div style={{ background: '#1c1400', border: '2px solid #ca8a04', borderRadius: '12px', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#fde68a' }}>{champ ?? '?'}</span>
              </div>
              <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '1px' }}>PREDICTED CHAMPION</span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch (err) {
    // Return error as visible image for debugging
    return new ImageResponse(
      (
        <div style={{ width: '1200px', height: '630px', background: '#1a0000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', fontFamily: 'sans-serif' }}>
          <span style={{ fontSize: '24px', color: '#ff4444', fontWeight: 700, marginBottom: '20px' }}>OG Route Error</span>
          <span style={{ fontSize: '14px', color: '#ff8888', textAlign: 'center', maxWidth: '1000px' }}>
            {err?.message ?? String(err)}
          </span>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}