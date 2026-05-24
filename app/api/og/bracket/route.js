// app/api/og/bracket/route.js
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const flag = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/20x15/${code}.png` : null
}

function winner(pred, t1, t2) {
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

  const buildRound = (code) =>
    (fixtures || []).filter(f => f.round === code).sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1 = res(f.slot1, f.match_number)
        const t2 = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        return { t1, t2, w: winner(pred, t1, t2) }
      })

  const r16  = buildRound('R16')
  const qf   = buildRound('QF')
  const sf   = buildRound('SF')
  const fin  = buildRound('FINAL')[0] ?? { t1: null, t2: null, w: null }
  const champ = fin.w
  const cf    = champ ? flag(champ) : null

  // pill style helpers — plain objects, no JSX
  const pillBg    = (t, isFinalist) => t === champ ? '#1c1400' : (!isFinalist && t && t !== 'TBD') ? (t === fin.t1 || t === fin.t2 ? '#0e1e35' : '#0e1e35') : '#0b1525'
  const pillBdr   = (t) => t === champ ? '#ca8a04' : '#0b1525'
  const pillColor = (t, w, isWin) => t === champ ? '#fde68a' : isWin ? '#88aed0' : '#607a95'

  // which teams won their matches (for ✓ display — excludes non-winners in Final)
  const won = (t, matchW, isFinal) => matchW === t && !!t

  const W = 1200, H = 630
  const HEADER = 80, LABELS = 24, FOOTER = 30
  const BODY = H - HEADER - LABELS - FOOTER
  const PAD = 36, GAP = 28

  const CW = { r16: 205, qf: 178, sf: 142, fin: 118 }
  const champW = W - PAD * 2 - CW.r16 - CW.qf - CW.sf - CW.fin - GAP * 4

  // inline pill renderer — returns style objects used directly in JSX below
  const ps = (t, matchW, h, isFinal) => {
    const isChamp = t === champ
    const isWin   = matchW === t && !!t
    const showTick = isFinal ? isChamp : isWin
    return {
      bg:    isChamp ? '#1c1400' : isWin ? '#0e1e35' : '#0b1525',
      bdr:   isChamp ? '#ca8a04' : isWin ? '#2a5080' : '#1a3050',
      bdrW:  isChamp ? 3 : 2,
      color: isChamp ? '#fde68a' : isWin ? '#88aed0' : '#607a95',
      fw:    isChamp ? 700 : isWin ? 500 : 400,
      tc:    isChamp ? '#ca8a04' : '#4a80b8',
      showTick,
      h,
    }
  }

  return new ImageResponse((
    <div style={{ width: `${W}px`, height: `${H}px`, background: '#060e1f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ height: `${HEADER}px`, background: '#0d1628', borderBottom: '2.5px solid #ca8a04', padding: `0 ${PAD}px`, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{name}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '9px', color: '#475569' }}>Play free at</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ca8a04' }}>thematchpredictor.com</span>
        </div>
      </div>

      {/* Round labels */}
      <div style={{ height: `${LABELS}px`, background: '#060e1f', flexShrink: 0, padding: `0 ${PAD}px`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <div style={{ width: `${CW.r16}px`, textAlign: 'center', flexShrink: 0 }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>ROUND OF 16</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.qf}px`, textAlign: 'center', flexShrink: 0 }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>QUARTER-FINALS</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.sf}px`, textAlign: 'center', flexShrink: 0 }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>SEMI-FINALS</span></div>
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        <div style={{ width: `${CW.fin}px`, textAlign: 'center', flexShrink: 0 }}><span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>FINAL</span></div>
      </div>

      {/* Body */}
      <div style={{ height: `${BODY}px`, flexShrink: 0, padding: `6px ${PAD}px 0`, display: 'flex', flexDirection: 'row' }}>

        {/* R16 — 8 matches, pill h=18 */}
        <div style={{ width: `${CW.r16}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {r16.map((m, i) => {
            const s1 = ps(m.t1, m.w, 18, false)
            const s2 = ps(m.t2, m.w, 18, false)
            const f1 = m.t1 ? flag(m.t1) : null
            const f2 = m.t2 ? flag(m.t2) : null
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s1.h}px`, padding: '0 6px', background: s1.bg, borderLeft: `${s1.bdrW}px solid ${s1.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                    {f1 && <img src={f1} width={14} height={10} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '10px', fontWeight: s1.fw, color: s1.color, whiteSpace: 'nowrap' }}>{m.t1 ?? '·'}</span>
                  </div>
                  {s1.showTick ? <span style={{ fontSize: '8px', color: s1.tc }}>✓</span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s2.h}px`, padding: '0 6px', background: s2.bg, borderLeft: `${s2.bdrW}px solid ${s2.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                    {f2 && <img src={f2} width={14} height={10} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '10px', fontWeight: s2.fw, color: s2.color, whiteSpace: 'nowrap' }}>{m.t2 ?? '·'}</span>
                  </div>
                  {s2.showTick ? <span style={{ fontSize: '8px', color: s2.tc }}>✓</span> : null}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* QF — 4 matches, pill h=26 */}
        <div style={{ width: `${CW.qf}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {qf.map((m, i) => {
            const s1 = ps(m.t1, m.w, 26, false)
            const s2 = ps(m.t2, m.w, 26, false)
            const f1 = m.t1 ? flag(m.t1) : null
            const f2 = m.t2 ? flag(m.t2) : null
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s1.h}px`, padding: '0 7px', background: s1.bg, borderLeft: `${s1.bdrW}px solid ${s1.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                    {f1 && <img src={f1} width={16} height={12} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '11px', fontWeight: s1.fw, color: s1.color, whiteSpace: 'nowrap' }}>{m.t1 ?? '·'}</span>
                  </div>
                  {s1.showTick ? <span style={{ fontSize: '9px', color: s1.tc }}>✓</span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s2.h}px`, padding: '0 7px', background: s2.bg, borderLeft: `${s2.bdrW}px solid ${s2.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                    {f2 && <img src={f2} width={16} height={12} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '11px', fontWeight: s2.fw, color: s2.color, whiteSpace: 'nowrap' }}>{m.t2 ?? '·'}</span>
                  </div>
                  {s2.showTick ? <span style={{ fontSize: '9px', color: s2.tc }}>✓</span> : null}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* SF — 2 matches, pill h=35 */}
        <div style={{ width: `${CW.sf}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {sf.map((m, i) => {
            const s1 = ps(m.t1, m.w, 35, false)
            const s2 = ps(m.t2, m.w, 35, false)
            const f1 = m.t1 ? flag(m.t1) : null
            const f2 = m.t2 ? flag(m.t2) : null
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s1.h}px`, padding: '0 8px', background: s1.bg, borderLeft: `${s1.bdrW}px solid ${s1.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                    {f1 && <img src={f1} width={18} height={13} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '13px', fontWeight: s1.fw, color: s1.color, whiteSpace: 'nowrap' }}>{m.t1 ?? '·'}</span>
                  </div>
                  {s1.showTick ? <span style={{ fontSize: '10px', color: s1.tc }}>✓</span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s2.h}px`, padding: '0 8px', background: s2.bg, borderLeft: `${s2.bdrW}px solid ${s2.bdr}`, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                    {f2 && <img src={f2} width={18} height={13} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '13px', fontWeight: s2.fw, color: s2.color, whiteSpace: 'nowrap' }}>{m.t2 ?? '·'}</span>
                  </div>
                  {s2.showTick ? <span style={{ fontSize: '10px', color: s2.tc }}>✓</span> : null}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* Final — 1 match centred, pill h=47 */}
        {(() => {
          const s1 = ps(fin.t1, fin.w, 47, true)
          const s2 = ps(fin.t2, fin.w, 47, true)
          const f1 = fin.t1 ? flag(fin.t1) : null
          const f2 = fin.t2 ? flag(fin.t2) : null
          return (
            <div style={{ width: `${CW.fin}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s1.h}px`, padding: '0 9px', background: s1.bg, borderLeft: `${s1.bdrW}px solid ${s1.bdr}`, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                    {f1 && <img src={f1} width={20} height={15} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '14px', fontWeight: s1.fw, color: s1.color, whiteSpace: 'nowrap' }}>{fin.t1 ?? '·'}</span>
                  </div>
                  {s1.showTick ? <span style={{ fontSize: '11px', color: s1.tc }}>✓</span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: `${s2.h}px`, padding: '0 9px', background: s2.bg, borderLeft: `${s2.bdrW}px solid ${s2.bdr}`, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                    {f2 && <img src={f2} width={20} height={15} style={{ objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '14px', fontWeight: s2.fw, color: s2.color, whiteSpace: 'nowrap' }}>{fin.t2 ?? '·'}</span>
                  </div>
                  {s2.showTick ? <span style={{ fontSize: '11px', color: s2.tc }}>✓</span> : null}
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* Champion */}
        <div style={{ width: `${champW}px`, height: `${BODY}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeft: '1px solid #111f33', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1400', border: '1.5px solid #ca8a04', borderRadius: '10px', padding: '16px 20px', gap: '8px' }}>
            {cf && <img src={cf} width={32} height={24} style={{ objectFit: 'cover' }} />}
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>{champ ?? '?'}</span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>

      {/* Footer */}
      <div style={{ height: `${FOOTER}px`, flexShrink: 0, borderTop: '1px solid #0f1e30', padding: `0 ${PAD}px`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
      </div>

    </div>
  ), { width: W, height: H })
}