// app/api/og/bracket/route.js
// test9 + colour styling only. No images, no COUNTRY_CODES, no new imports.
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

function pickWinner(pred, t1, t2) {
  if (!pred || pred.home == null || pred.away == null) return null
  if (pred.home > pred.away) return t1
  if (pred.away > pred.home) return t2
  return null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId   = searchParams.get('userId')
  const leagueId = searchParams.get('leagueId')
  if (!userId || !leagueId) return new Response('Missing params', { status: 400 })

  const admin = createAdminClient()
  const [
    { data: profile }, { data: membership }, { data: fixtures }, { data: predictions },
  ] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', userId).single(),
    admin.from('league_members').select('nickname').eq('league_id', leagueId).eq('user_id', userId).single(),
    admin.from('fixtures').select('*').order('match_number', { ascending: true }),
    admin.from('predictions').select('fixture_id,predicted_home,predicted_away').eq('user_id', userId).eq('league_id', leagueId),
  ])

  const name = membership?.nickname || profile?.display_name || 'Player'
  const predMap = {}
  for (const p of predictions || []) predMap[p.fixture_id] = p
  const byNum = {}
  for (const f of fixtures || []) if (f.match_number) byNum[f.match_number] = f

  const tables   = calcGroupTables(predMap, fixtures || [])
  const annexMap = buildAnnexMap(tables)
  const res = (slot, num) => resolveSlot(slot, num, tables, annexMap, predMap, byNum)

  const buildRound = (code) =>
    (fixtures || []).filter(f => f.round === code).sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1 = res(f.slot1, f.match_number)
        const t2 = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        return { t1: String(t1 || 'TBD'), t2: String(t2 || 'TBD'), w: String(pickWinner(pred, t1, t2) || '') }
      })

  const r16 = buildRound('R16')
  const qf  = buildRound('QF')
  const sf  = buildRound('SF')
  const fin = buildRound('FINAL')[0] ?? { t1: 'TBD', t2: 'TBD', w: '' }
  const champ = fin.w || '?'

  return new ImageResponse((
    <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', flexDirection: 'column', padding: '36px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #ca8a04' }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{name}</span>
        <span style={{ fontSize: '13px', color: '#ca8a04', fontWeight: 700 }}>Champion: {champ}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flex: 1 }}>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: '180px' }}>
          {r16.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ background: m.t1 === champ ? '#1c1400' : m.w === m.t1 && m.t1 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t1 === champ ? '3px solid #ca8a04' : m.w === m.t1 && m.t1 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '18px', paddingLeft: '6px', paddingRight: '6px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t1 === champ ? '#fde68a' : m.w === m.t1 && m.t1 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '10px', whiteSpace: 'nowrap' }}>{m.t1}</span>
              </div>
              <div style={{ background: m.t2 === champ ? '#1c1400' : m.w === m.t2 && m.t2 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t2 === champ ? '3px solid #ca8a04' : m.w === m.t2 && m.t2 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '18px', paddingLeft: '6px', paddingRight: '6px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t2 === champ ? '#fde68a' : m.w === m.t2 && m.t2 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '10px', whiteSpace: 'nowrap' }}>{m.t2}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: '160px' }}>
          {qf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ background: m.t1 === champ ? '#1c1400' : m.w === m.t1 && m.t1 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t1 === champ ? '3px solid #ca8a04' : m.w === m.t1 && m.t1 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '26px', paddingLeft: '6px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t1 === champ ? '#fde68a' : m.w === m.t1 && m.t1 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '11px', whiteSpace: 'nowrap' }}>{m.t1}</span>
              </div>
              <div style={{ background: m.t2 === champ ? '#1c1400' : m.w === m.t2 && m.t2 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t2 === champ ? '3px solid #ca8a04' : m.w === m.t2 && m.t2 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '26px', paddingLeft: '6px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t2 === champ ? '#fde68a' : m.w === m.t2 && m.t2 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '11px', whiteSpace: 'nowrap' }}>{m.t2}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: '140px' }}>
          {sf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ background: m.t1 === champ ? '#1c1400' : m.w === m.t1 && m.t1 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t1 === champ ? '3px solid #ca8a04' : m.w === m.t1 && m.t1 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '35px', paddingLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t1 === champ ? '#fde68a' : m.w === m.t1 && m.t1 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '13px', whiteSpace: 'nowrap' }}>{m.t1}</span>
              </div>
              <div style={{ background: m.t2 === champ ? '#1c1400' : m.w === m.t2 && m.t2 !== 'TBD' ? '#0e1e35' : '#0b1525', borderLeft: m.t2 === champ ? '3px solid #ca8a04' : m.w === m.t2 && m.t2 !== 'TBD' ? '2px solid #2a5080' : '2px solid #1a3050', height: '35px', paddingLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.t2 === champ ? '#fde68a' : m.w === m.t2 && m.t2 !== 'TBD' ? '#88aed0' : '#607a95', fontSize: '13px', whiteSpace: 'nowrap' }}>{m.t2}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '120px', gap: '4px' }}>
          <div style={{ background: '#1c1400', borderLeft: '3px solid #ca8a04', height: '47px', paddingLeft: '9px', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#fde68a', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fin.t1}</span>
          </div>
          <div style={{ background: fin.t2 === champ ? '#1c1400' : '#0e1e35', borderLeft: fin.t2 === champ ? '3px solid #ca8a04' : '2px solid #2a5080', height: '47px', paddingLeft: '9px', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: fin.t2 === champ ? '#fde68a' : '#88aed0', fontSize: '14px', whiteSpace: 'nowrap' }}>{fin.t2}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeft: '1px solid #111f33' }}>
          <div style={{ background: '#1c1400', border: '2px solid #ca8a04', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fde68a' }}>{champ}</span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>
    </div>
  ), { width: 1200, height: 630 })
}