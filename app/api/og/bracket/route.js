// app/api/og/bracket/route.js
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

// Pre-built style objects — no computed values inside JSX
const S = {
  c: { bg: '#1c1400', border: '3px solid #ca8a04', color: '#fde68a', fw: 700, tc: '#ca8a04' },
  w: { bg: '#0e1e35', border: '2px solid #2a5080', color: '#88aed0', fw: 500, tc: '#4a80b8' },
  l: { bg: '#0b1525', border: '2px solid #1a3050', color: '#607a95', fw: 400, tc: '#4a80b8' },
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

  // Pre-compute pill data — variant (c/w/l), tick, flag URL — all as plain strings
  const vt = (team, matchW, isFinal) => ({
    v: team === champ ? 'c' : matchW === team && team !== 'TBD' ? 'w' : 'l',
    tick: isFinal ? team === champ : (matchW === team && team !== 'TBD'),
    flag: COUNTRY_CODES[team] ? `https://flagcdn.com/20x15/${COUNTRY_CODES[team]}.png` : '',
  })

  const p16  = r16.map(m => ({ t1: m.t1, ...vt(m.t1, m.w, false), t2: m.t2, v2: vt(m.t2, m.w, false).v, tick2: vt(m.t2, m.w, false).tick, flag2: vt(m.t2, m.w, false).flag }))
  const pQF  = qf.map(m  => ({ t1: m.t1, ...vt(m.t1, m.w, false), t2: m.t2, v2: vt(m.t2, m.w, false).v, tick2: vt(m.t2, m.w, false).tick, flag2: vt(m.t2, m.w, false).flag }))
  const pSF  = sf.map(m  => ({ t1: m.t1, ...vt(m.t1, m.w, false), t2: m.t2, v2: vt(m.t2, m.w, false).v, tick2: vt(m.t2, m.w, false).tick, flag2: vt(m.t2, m.w, false).flag }))
  const ft1  = vt(fin.t1, fin.w, true)
  const ft2  = vt(fin.t2, fin.w, true)
  const cf   = COUNTRY_CODES[champ] ? `https://flagcdn.com/32x24/${COUNTRY_CODES[champ]}.png` : ''

  // Pill renderer — returns array of two divs, no conditionals
  const pill = (team, v, tick, flag, h, fs) => [
    <div key="flag-wrap" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
      {flag ? <img src={flag} width={fs > 11 ? 18 : 14} height={fs > 11 ? 13 : 10} style={{ objectFit: 'cover' }} /> : <div style={{ width: fs > 11 ? 18 : 14, height: fs > 11 ? 13 : 10 }} />}
      <span style={{ fontSize: `${fs}px`, fontWeight: S[v].fw, color: S[v].color, whiteSpace: 'nowrap' }}>{team}</span>
    </div>,
    <span key="tick" style={{ fontSize: `${Math.round(fs * 0.85)}px`, color: tick ? S[v].tc : 'transparent' }}>v</span>
  ]

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
          {p16.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '4px', background: S[p.v].bg, borderLeft: S[p.v].border, borderRadius: '3px' }}>
                {pill(p.t1, p.v, p.tick, p.flag, 18, 10)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '18px', paddingLeft: '6px', paddingRight: '4px', background: S[p.v2].bg, borderLeft: S[p.v2].border, borderRadius: '3px' }}>
                {pill(p.t2, p.v2, p.tick2, p.flag2, 18, 10)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '178px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {pQF.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '4px', background: S[p.v].bg, borderLeft: S[p.v].border, borderRadius: '3px' }}>
                {pill(p.t1, p.v, p.tick, p.flag, 26, 11)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '26px', paddingLeft: '7px', paddingRight: '4px', background: S[p.v2].bg, borderLeft: S[p.v2].border, borderRadius: '3px' }}>
                {pill(p.t2, p.v2, p.tick2, p.flag2, 26, 11)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '142px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {pSF.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '4px', background: S[p.v].bg, borderLeft: S[p.v].border, borderRadius: '3px' }}>
                {pill(p.t1, p.v, p.tick, p.flag, 35, 13)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '35px', paddingLeft: '8px', paddingRight: '4px', background: S[p.v2].bg, borderLeft: S[p.v2].border, borderRadius: '3px' }}>
                {pill(p.t2, p.v2, p.tick2, p.flag2, 35, 13)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '118px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '4px', background: S[ft1.v].bg, borderLeft: S[ft1.v].border, borderRadius: '4px' }}>
            {pill(fin.t1, ft1.v, ft1.tick, ft1.flag, 47, 14)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '47px', paddingLeft: '9px', paddingRight: '4px', background: S[ft2.v].bg, borderLeft: S[ft2.v].border, borderRadius: '4px' }}>
            {pill(fin.t2, ft2.v, ft2.tick, ft2.flag, 47, 14)}
          </div>
        </div>

        <div style={{ width: '28px', flexShrink: 0 }} />

        <div style={{ width: '373px', height: '496px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderLeft: '1px solid #111f33', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1400', border: '2px solid #ca8a04', borderRadius: '10px', padding: '16px 20px', gap: '8px' }}>
            {cf ? <img src={cf} width={32} height={24} style={{ objectFit: 'cover' }} /> : <div style={{ width: '32px', height: '24px' }} />}
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