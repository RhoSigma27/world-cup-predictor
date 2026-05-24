// app/api/og/bracket/route.js
// Test 4: full render, NO flag images, NO IIFE
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

  const tables = calcGroupTables(predMap, fixtures || [])
  const annexMap = buildAnnexMap(tables)
  const res = (slot, num) => resolveSlot(slot, num, tables, annexMap, predMap, byNum)

  const buildRound = (code) =>
    (fixtures || []).filter(f => f.round === code).sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1 = res(f.slot1, f.match_number)
        const t2 = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        return { t1, t2, w: pickWinner(pred, t1, t2) }
      })

  const r16 = buildRound('R16')
  const qf  = buildRound('QF')
  const sf  = buildRound('SF')
  const finalMatches = buildRound('FINAL')
  const fin = finalMatches[0] ?? { t1: null, t2: null, w: null }
  const champ = fin.w

  const W = 1200, H = 630
  const PAD = 36, GAP = 28
  const HEADER = 80, LABELS = 24, FOOTER = 30
  const BODY = H - HEADER - LABELS - FOOTER
  const CW = { r16: 205, qf: 178, sf: 142, fin: 118 }
  const champW = W - PAD * 2 - CW.r16 - CW.qf - CW.sf - CW.fin - GAP * 4

  const getBg    = (t, w) => t === champ ? '#1c1400' : w === t && t ? '#0e1e35' : '#0b1525'
  const getBdr   = (t, w) => t === champ ? '#ca8a04' : w === t && t ? '#2a5080' : '#1a3050'
  const getBdrW  = (t)    => t === champ ? 3 : 2
  const getColor = (t, w) => t === champ ? '#fde68a' : w === t && t ? '#88aed0' : '#607a95'
  const getFw    = (t, w) => t === champ ? 700 : w === t && t ? 500 : 400

  return new ImageResponse((
    <div style={{ width: `${W}px`, height: `${H}px`, background: '#060e1f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ height: `${HEADER}px`, background: '#0d1628', borderBottom: '2.5px solid #ca8a04', padding: `0 ${PAD}px`, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{name}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ca8a04' }}>thematchpredictor.com</span>
      </div>

      <div style={{ height: `${LABELS}px`, background: '#060e1f', flexShrink: 0, padding: `0 ${PAD}px`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <div style={{ width: `${CW.r16}px`, flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>ROUND OF 16</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.qf}px`, flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>QUARTER-FINALS</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.sf}px`, flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>SEMI-FINALS</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.fin}px`, flexShrink: 0, textAlign: 'center' }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>FINAL</span></div>
      </div>

      <div style={{ height: `${BODY}px`, flexShrink: 0, paddingTop: '6px', paddingLeft: `${PAD}px`, paddingRight: `${PAD}px`, display: 'flex', flexDirection: 'row' }}>

        <div style={{ width: `${CW.r16}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {r16.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '6px', background: getBg(m.t1, m.w), borderLeft: `${getBdrW(m.t1)}px solid ${getBdr(m.t1, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '10px', fontWeight: getFw(m.t1, m.w), color: getColor(m.t1, m.w), whiteSpace: 'nowrap' }}>{m.t1 || '·'}</span>
                {m.w === m.t1 && m.t1 ? <span style={{ fontSize: '8px', color: m.t1 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '6px', background: getBg(m.t2, m.w), borderLeft: `${getBdrW(m.t2)}px solid ${getBdr(m.t2, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '10px', fontWeight: getFw(m.t2, m.w), color: getColor(m.t2, m.w), whiteSpace: 'nowrap' }}>{m.t2 || '·'}</span>
                {m.w === m.t2 && m.t2 ? <span style={{ fontSize: '8px', color: m.t2 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        <div style={{ width: `${CW.qf}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {qf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '7px', background: getBg(m.t1, m.w), borderLeft: `${getBdrW(m.t1)}px solid ${getBdr(m.t1, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '11px', fontWeight: getFw(m.t1, m.w), color: getColor(m.t1, m.w), whiteSpace: 'nowrap' }}>{m.t1 || '·'}</span>
                {m.w === m.t1 && m.t1 ? <span style={{ fontSize: '9px', color: m.t1 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '7px', background: getBg(m.t2, m.w), borderLeft: `${getBdrW(m.t2)}px solid ${getBdr(m.t2, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '11px', fontWeight: getFw(m.t2, m.w), color: getColor(m.t2, m.w), whiteSpace: 'nowrap' }}>{m.t2 || '·'}</span>
                {m.w === m.t2 && m.t2 ? <span style={{ fontSize: '9px', color: m.t2 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        <div style={{ width: `${CW.sf}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {sf.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '8px', background: getBg(m.t1, m.w), borderLeft: `${getBdrW(m.t1)}px solid ${getBdr(m.t1, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '13px', fontWeight: getFw(m.t1, m.w), color: getColor(m.t1, m.w), whiteSpace: 'nowrap' }}>{m.t1 || '·'}</span>
                {m.w === m.t1 && m.t1 ? <span style={{ fontSize: '10px', color: m.t1 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '8px', background: getBg(m.t2, m.w), borderLeft: `${getBdrW(m.t2)}px solid ${getBdr(m.t2, m.w)}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '13px', fontWeight: getFw(m.t2, m.w), color: getColor(m.t2, m.w), whiteSpace: 'nowrap' }}>{m.t2 || '·'}</span>
                {m.w === m.t2 && m.t2 ? <span style={{ fontSize: '10px', color: m.t2 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        <div style={{ width: `${CW.fin}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '9px', background: getBg(fin.t1, fin.w), borderLeft: `${getBdrW(fin.t1)}px solid ${getBdr(fin.t1, fin.w)}`, borderRadius: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: getFw(fin.t1, fin.w), color: getColor(fin.t1, fin.w), whiteSpace: 'nowrap' }}>{fin.t1 || '·'}</span>
              {fin.w === fin.t1 && fin.t1 ? <span style={{ fontSize: '11px', color: fin.t1 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '9px', background: getBg(fin.t2, fin.w), borderLeft: `${getBdrW(fin.t2)}px solid ${getBdr(fin.t2, fin.w)}`, borderRadius: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: getFw(fin.t2, fin.w), color: getColor(fin.t2, fin.w), whiteSpace: 'nowrap' }}>{fin.t2 || '·'}</span>
              {fin.w === fin.t2 && fin.t2 ? <span style={{ fontSize: '11px', color: fin.t2 === champ ? '#ca8a04' : '#4a80b8' }}>✓</span> : null}
            </div>
          </div>
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        <div style={{ width: `${champW}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeft: '1px solid #111f33', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1400', border: '1.5px solid #ca8a04', borderRadius: '10px', padding: '16px 20px', gap: '8px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>{champ || '?'}</span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>

      <div style={{ height: `${FOOTER}px`, flexShrink: 0, borderTop: '1px solid #0f1e30', paddingLeft: `${PAD}px`, paddingRight: `${PAD}px`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
      </div>

    </div>
  ), { width: W, height: H })
}