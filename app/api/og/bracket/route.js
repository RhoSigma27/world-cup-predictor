// app/api/og/bracket/route.js
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = "nodejs"

const flagSrc = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/20x15/${code}.png` : null
}

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
        return { t1, t2, w: pickWinner(pred, t1, t2) }
      })

  const r16  = buildRound('R16')
  const qf   = buildRound('QF')
  const sf   = buildRound('SF')
  const fin  = buildRound('FINAL')[0] ?? { t1: null, t2: null, w: null }
  const champ = fin.w
  const cf    = champ ? flagSrc(champ) : null

  // Pre-compute pill data arrays to avoid any logic inside JSX
  const makePills = (matches, h, isFinal) => matches.map(m => ({
    t1: m.t1, t2: m.t2,
    f1: m.t1 ? flagSrc(m.t1) : null,
    f2: m.t2 ? flagSrc(m.t2) : null,
    h,
    v1: m.t1 === champ ? 'c' : m.w === m.t1 && m.t1 ? 'w' : 'l',
    v2: m.t2 === champ ? 'c' : m.w === m.t2 && m.t2 ? 'w' : 'l',
    tick1: !isFinal ? (m.w === m.t1 && !!m.t1) : (m.t1 === champ),
    tick2: !isFinal ? (m.w === m.t2 && !!m.t2) : (m.t2 === champ),
  }))

  const pills16 = makePills(r16, 18, false)
  const pillsQF = makePills(qf, 26, false)
  const pillsSF = makePills(sf, 35, false)
  const pillsFin = makePills([fin], 47, true)

  const bg    = (v) => v === 'c' ? '#1c1400' : v === 'w' ? '#0e1e35' : '#0b1525'
  const bdrC  = (v) => v === 'c' ? '#ca8a04' : v === 'w' ? '#2a5080' : '#1a3050'
  const bdrW  = (v) => v === 'c' ? 3 : 2
  const color = (v) => v === 'c' ? '#fde68a' : v === 'w' ? '#88aed0' : '#607a95'
  const fw    = (v) => v === 'c' ? 700 : v === 'w' ? 500 : 400
  const tC    = (v) => v === 'c' ? '#ca8a04' : '#4a80b8'

  const W = 1200, H = 630
  const PAD = 36, GAP = 28
  const HEADER = 80, LABELS = 24, FOOTER = 30
  const BODY = 496
  const r16W = 205, qfW = 178, sfW = 142, finW = 118
  const champW = W - PAD * 2 - r16W - qfW - sfW - finW - GAP * 4

  return new ImageResponse((
    <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ height: '80px', background: '#0d1628', borderBottomWidth: '2.5px', borderBottomStyle: 'solid', borderBottomColor: '#ca8a04', paddingLeft: '36px', paddingRight: '36px', flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {pills16.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '6px', background: bg(p.v1), borderLeftWidth: bdrW(p.v1), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v1), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                  {p.f1 ? <img src={p.f1} width={14} height={10} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '10px', fontWeight: fw(p.v1), color: color(p.v1), whiteSpace: 'nowrap' }}>{p.t1 || 'TBD'}</span>
                </div>
                {p.tick1 ? <span style={{ fontSize: '8px', color: tC(p.v1) }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '6px', background: bg(p.v2), borderLeftWidth: bdrW(p.v2), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v2), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                  {p.f2 ? <img src={p.f2} width={14} height={10} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '10px', fontWeight: fw(p.v2), color: color(p.v2), whiteSpace: 'nowrap' }}>{p.t2 || 'TBD'}</span>
                </div>
                {p.tick2 ? <span style={{ fontSize: '8px', color: tC(p.v2) }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '178px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {pillsQF.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '7px', background: bg(p.v1), borderLeftWidth: bdrW(p.v1), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v1), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  {p.f1 ? <img src={p.f1} width={16} height={12} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '11px', fontWeight: fw(p.v1), color: color(p.v1), whiteSpace: 'nowrap' }}>{p.t1 || 'TBD'}</span>
                </div>
                {p.tick1 ? <span style={{ fontSize: '9px', color: tC(p.v1) }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '7px', background: bg(p.v2), borderLeftWidth: bdrW(p.v2), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v2), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  {p.f2 ? <img src={p.f2} width={16} height={12} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '11px', fontWeight: fw(p.v2), color: color(p.v2), whiteSpace: 'nowrap' }}>{p.t2 || 'TBD'}</span>
                </div>
                {p.tick2 ? <span style={{ fontSize: '9px', color: tC(p.v2) }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '142px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {pillsSF.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '8px', background: bg(p.v1), borderLeftWidth: bdrW(p.v1), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v1), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  {p.f1 ? <img src={p.f1} width={18} height={13} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '13px', fontWeight: fw(p.v1), color: color(p.v1), whiteSpace: 'nowrap' }}>{p.t1 || 'TBD'}</span>
                </div>
                {p.tick1 ? <span style={{ fontSize: '10px', color: tC(p.v1) }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '8px', background: bg(p.v2), borderLeftWidth: bdrW(p.v2), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v2), borderRadius: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                  {p.f2 ? <img src={p.f2} width={18} height={13} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '13px', fontWeight: fw(p.v2), color: color(p.v2), whiteSpace: 'nowrap' }}>{p.t2 || 'TBD'}</span>
                </div>
                {p.tick2 ? <span style={{ fontSize: '10px', color: tC(p.v2) }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '118px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {pillsFin.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '9px', background: bg(p.v1), borderLeftWidth: bdrW(p.v1), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v1), borderRadius: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                  {p.f1 ? <img src={p.f1} width={20} height={15} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '14px', fontWeight: fw(p.v1), color: color(p.v1), whiteSpace: 'nowrap' }}>{p.t1 || 'TBD'}</span>
                </div>
                {p.tick1 ? <span style={{ fontSize: '11px', color: tC(p.v1) }}>✓</span> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '9px', background: bg(p.v2), borderLeftWidth: bdrW(p.v2), borderLeftStyle: 'solid', borderLeftColor: bdrC(p.v2), borderRadius: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                  {p.f2 ? <img src={p.f2} width={20} height={15} style={{ objectFit: 'cover' }} /> : null}
                  <span style={{ fontSize: '14px', fontWeight: fw(p.v2), color: color(p.v2), whiteSpace: 'nowrap' }}>{p.t2 || 'TBD'}</span>
                </div>
                {p.tick2 ? <span style={{ fontSize: '11px', color: tC(p.v2) }}>✓</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '373px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: '#111f33', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1400', borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#ca8a04', borderRadius: '10px', padding: '16px', gap: '8px' }}>
            {cf ? <img src={cf} width={32} height={24} style={{ objectFit: 'cover' }} /> : null}
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>{champ || '?'}</span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>

      <div style={{ height: '30px', flexShrink: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#0f1e30', paddingLeft: '36px', paddingRight: '36px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
      </div>

    </div>
  ), { width: 1200, height: 630 })
}