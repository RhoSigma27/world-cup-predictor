// app/api/og/bracket/route.js
// Based on test9 which rendered — all JSX fully inline, no functions returning JSX
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
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
        const w = pickWinner(pred, t1, t2)
        return {
          t1: String(t1 || 'TBD'), t2: String(t2 || 'TBD'), w: String(w || ''),
          f1: COUNTRY_CODES[String(t1||'')] ? `https://flagcdn.com/20x15/${COUNTRY_CODES[String(t1||'')]}.png` : '',
          f2: COUNTRY_CODES[String(t2||'')] ? `https://flagcdn.com/20x15/${COUNTRY_CODES[String(t2||'')]}.png` : '',
        }
      })

  const r16 = buildRound('R16')
  const qf  = buildRound('QF')
  const sf  = buildRound('SF')
  const fin = buildRound('FINAL')[0] ?? { t1: 'TBD', t2: 'TBD', w: '', f1: '', f2: '' }
  const champ = fin.w || '?'
  const cf = COUNTRY_CODES[champ] ? `https://flagcdn.com/32x24/${COUNTRY_CODES[champ]}.png` : ''

  // Style helpers — return plain values only, never JSX
  const bg  = (t, w) => t === champ ? '#1c1400' : (w === t && t !== 'TBD') ? '#0e1e35' : '#0b1525'
  const bdr = (t, w) => t === champ ? '3px solid #ca8a04' : (w === t && t !== 'TBD') ? '2px solid #2a5080' : '2px solid #1a3050'
  const col = (t, w) => t === champ ? '#fde68a' : (w === t && t !== 'TBD') ? '#88aed0' : '#607a95'
  const fw  = (t, w) => t === champ ? 700 : (w === t && t !== 'TBD') ? 500 : 400
  const tc  = (t, w) => (t === champ || (w === t && t !== 'TBD')) ? (t === champ ? '#ca8a04' : '#4a80b8') : 'transparent'

  return new ImageResponse((
    <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ height: '80px', background: '#0d1628', borderBottom: '2.5px solid #ca8a04', paddingLeft: '36px', paddingRight: '36px', flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{name}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '9px', color: '#475569' }}>Play free at</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ca8a04' }}>thematchpredictor.com</span>
        </div>
      </div>

      <div style={{ height: '24px', background: '#060e1f', flexShrink: 0, paddingLeft: '36px', paddingRight: '36px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <div style={{ width: '205px', flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>ROUND OF 16</span></div>
        <div style={{ width: '28px', flexShrink: 0 }} />
        <div style={{ width: '178px', flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>QUARTER-FINALS</span></div>
        <div style={{ width: '28px', flexShrink: 0 }} />
        <div style={{ width: '142px', flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>SEMI-FINALS</span></div>
        <div style={{ width: '28px', flexShrink: 0 }} />
        <div style={{ width: '118px', flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>FINAL</span></div>
      </div>

      <div style={{ height: '496px', flexShrink: 0, paddingTop: '6px', paddingLeft: '36px', paddingRight: '36px', display: 'flex', flexDirection: 'row' }}>

        <div style={{ width: '205px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {r16.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '4px', background: bg(m.t1,m.w), borderLeft: bdr(m.t1,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                  <img src={m.f1 || `https://flagcdn.com/20x15/un.png`} width={14} height={10} style={{ objectFit: 'cover', opacity: m.f1 ? 1 : 0 }} />
                  <span style={{ fontSize: '10px', fontWeight: fw(m.t1,m.w), color: col(m.t1,m.w), whiteSpace: 'nowrap' }}>{m.t1}</span>
                </div>
                <span style={{ fontSize: '8px', color: tc(m.t1,m.w) }}>v</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '4px', background: bg(m.t2,m.w), borderLeft: bdr(m.t2,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                  <img src={m.f2 || `https://flagcdn.com/20x15/un.png`} width={14} height={10} style={{ objectFit: 'cover', opacity: m.f2 ? 1 : 0 }} />
                  <span style={{ fontSize: '10px', fontWeight: fw(m.t2,m.w), color: col(m.t2,m.w), whiteSpace: 'nowrap' }}>{m.t2}</span>
                </div>
                <span style={{ fontSize: '8px', color: tc(m.t2,m.w) }}>v</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '178px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {qf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '4px', background: bg(m.t1,m.w), borderLeft: bdr(m.t1,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  <img src={m.f1 || `https://flagcdn.com/20x15/un.png`} width={16} height={12} style={{ objectFit: 'cover', opacity: m.f1 ? 1 : 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: fw(m.t1,m.w), color: col(m.t1,m.w), whiteSpace: 'nowrap' }}>{m.t1}</span>
                </div>
                <span style={{ fontSize: '9px', color: tc(m.t1,m.w) }}>v</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '4px', background: bg(m.t2,m.w), borderLeft: bdr(m.t2,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  <img src={m.f2 || `https://flagcdn.com/20x15/un.png`} width={16} height={12} style={{ objectFit: 'cover', opacity: m.f2 ? 1 : 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: fw(m.t2,m.w), color: col(m.t2,m.w), whiteSpace: 'nowrap' }}>{m.t2}</span>
                </div>
                <span style={{ fontSize: '9px', color: tc(m.t2,m.w) }}>v</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '142px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {sf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '4px', background: bg(m.t1,m.w), borderLeft: bdr(m.t1,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  <img src={m.f1 || `https://flagcdn.com/20x15/un.png`} width={18} height={13} style={{ objectFit: 'cover', opacity: m.f1 ? 1 : 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: fw(m.t1,m.w), color: col(m.t1,m.w), whiteSpace: 'nowrap' }}>{m.t1}</span>
                </div>
                <span style={{ fontSize: '10px', color: tc(m.t1,m.w) }}>v</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '4px', background: bg(m.t2,m.w), borderLeft: bdr(m.t2,m.w), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  <img src={m.f2 || `https://flagcdn.com/20x15/un.png`} width={18} height={13} style={{ objectFit: 'cover', opacity: m.f2 ? 1 : 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: fw(m.t2,m.w), color: col(m.t2,m.w), whiteSpace: 'nowrap' }}>{m.t2}</span>
                </div>
                <span style={{ fontSize: '10px', color: tc(m.t2,m.w) }}>v</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '118px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '4px', background: bg(fin.t1,fin.w), borderLeft: bdr(fin.t1,fin.w), borderRadius: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
              <img src={fin.f1 || `https://flagcdn.com/20x15/un.png`} width={20} height={15} style={{ objectFit: 'cover', opacity: fin.f1 ? 1 : 0 }} />
              <span style={{ fontSize: '14px', fontWeight: fw(fin.t1,fin.w), color: col(fin.t1,fin.w), whiteSpace: 'nowrap' }}>{fin.t1}</span>
            </div>
            <span style={{ fontSize: '11px', color: tc(fin.t1,fin.w) }}>v</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '4px', background: bg(fin.t2,fin.w), borderLeft: bdr(fin.t2,fin.w), borderRadius: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
              <img src={fin.f2 || `https://flagcdn.com/20x15/un.png`} width={20} height={15} style={{ objectFit: 'cover', opacity: fin.f2 ? 1 : 0 }} />
              <span style={{ fontSize: '14px', fontWeight: fw(fin.t2,fin.w), color: col(fin.t2,fin.w), whiteSpace: 'nowrap' }}>{fin.t2}</span>
            </div>
            <span style={{ fontSize: '11px', color: tc(fin.t2,fin.w) }}>v</span>
          </div>
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '373px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeft: '1px solid #111f33', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1400', border: '2px solid #ca8a04', borderRadius: '10px', padding: '16px 20px', gap: '8px' }}>
            <img src={cf || `https://flagcdn.com/32x24/un.png`} width={32} height={24} style={{ objectFit: 'cover', opacity: cf ? 1 : 0 }} />
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>{champ}</span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>

      <div style={{ height: '30px', flexShrink: 0, borderTop: '1px solid #0f1e30', paddingLeft: '36px', paddingRight: '36px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
      </div>

    </div>
  ), { width: 1200, height: 630 })
}