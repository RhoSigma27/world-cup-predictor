// app/api/og/bracket/route.js
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

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
      .map(f => {
        const t1   = res(f.slot1, f.match_number)
        const t2   = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        return { t1, t2, w: pickWinner(pred, t1, t2) }
      })

  const r16   = buildRound('R16')
  const qf    = buildRound('QF')
  const sf    = buildRound('SF')
  const final = buildRound('FINAL')
  const fin   = final[0] ?? { t1: null, t2: null, w: null }
  const champ = fin.w
  const champFlag = champ ? flagSrc(champ) : null

  // ── Layout ────────────────────────────────────────────────────────────────
  const W = 1200, H = 630
  const HEADER = 80, LABELS = 24, FOOTER = 30
  const BODY = H - HEADER - LABELS - FOOTER
  const PAD = 36, GAP = 30

  const CW = { r16: 190, qf: 168, sf: 134, fin: 112 }
  const champW = W - PAD*2 - CW.r16 - CW.qf - CW.sf - CW.fin - GAP*4

  // pill renderer — inline, no sub-component
  const pill = (team, variant, h, fs, showTick) => {
    const resolved = team && team !== 'TBD'
    const f = resolved ? flagSrc(team) : null
    const isChamp  = variant === 'champ'
    const isWinner = variant === 'winner'
    const bg    = isChamp ? '#1c1400' : isWinner ? '#0e1e35' : '#0b1525'
    const bdr   = isChamp ? '#ca8a04' : isWinner ? '#2a5080' : '#1a3050'
    const bdrW  = isChamp ? 3 : 2
    const color = isChamp ? '#fde68a' : isWinner ? '#88aed0' : '#607a95'
    const fw    = isChamp ? 700 : isWinner ? 500 : 400
    const tickC = isChamp ? '#ca8a04' : isWinner ? '#4a80b8' : 'transparent'

    return (
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        height: `${h}px`, padding: `0 8px`,
        background: bg,
        borderLeft: `${bdrW}px solid ${bdr}`,
        borderRadius: '3px', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
          {f && <img src={f} width={16} height={12} style={{ objectFit: 'cover', flexShrink: 0 }} />}
          <span style={{ fontSize: `${fs}px`, fontWeight: fw, color, whiteSpace: 'nowrap' }}>
            {resolved ? team : '\u00B7'}
          </span>
        </div>
        {showTick && (
          <span style={{ fontSize: `${Math.round(fs * 0.85)}px`, color: tickC, flexShrink: 0, marginLeft: '3px' }}>
            {'\u2713'}
          </span>
        )}
      </div>
    )
  }

  // match = 2 pills, stacked
  const match = (t1, t2, winner, champ_, h, fs, gap, isFinal) => {
    const v1 = t1 === champ_ ? 'champ' : winner === t1 && !!t1 ? 'winner' : 'loser'
    const v2 = t2 === champ_ ? 'champ' : winner === t2 && !!t2 ? 'winner' : 'loser'
    const tick1 = winner === t1 && !!t1
    const tick2 = winner === t2 && !!t2
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {pill(t1, v1, h, fs, tick1)}
        {pill(t2, v2, h, fs, tick2)}
      </div>
    )
  }

  // column = n matches evenly spaced
  const col = (matches, h, fs, gap, w) => (
    <div style={{
      width: `${w}px`, height: `${BODY}px`, flexShrink: 0,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
    }}>
      {matches.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
          {match(m.t1, m.t2, m.w, champ, h, fs, gap, false)}
        </div>
      ))}
    </div>
  )

  return new ImageResponse((
    <div style={{
      width: `${W}px`, height: `${H}px`,
      background: '#060e1f',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        height: `${HEADER}px`, background: '#0d1628',
        borderBottom: '2.5px solid #ca8a04',
        padding: `0 ${PAD}px`, flexShrink: 0,
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
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
      <div style={{
        height: `${LABELS}px`, background: '#060e1f', flexShrink: 0,
        padding: `0 ${PAD}px`,
        display: 'flex', flexDirection: 'row', alignItems: 'center',
      }}>
        {[
          [CW.r16, 'ROUND OF 16'], [GAP, ''], [CW.qf, 'QUARTER-FINALS'],
          [GAP, ''], [CW.sf, 'SEMI-FINALS'], [GAP, ''],
          [CW.fin, 'FINAL'], [GAP, ''], [champW, ''],
        ].map(([w, label], i) => (
          <div key={i} style={{ width: `${w}px`, flexShrink: 0, textAlign: 'center' }}>
            <span style={{ fontSize: '7px', fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{
        height: `${BODY}px`, flexShrink: 0,
        padding: `6px ${PAD}px 0`,
        display: 'flex', flexDirection: 'row',
      }}>
        {col(r16, 18, 10, 2, CW.r16)}
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        {col(qf, 26, 11, 2, CW.qf)}
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />
        {col(sf, 34, 13, 3, CW.sf)}
        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* Final — centred */}
        <div style={{
          width: `${CW.fin}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {match(fin.t1, fin.t2, fin.w, champ, 46, 14, 4, true)}
        </div>

        <div style={{ width: `${GAP}px`, flexShrink: 0 }} />

        {/* Champion */}
        <div style={{
          width: `${champW}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          borderLeft: '1px solid #111f33', paddingLeft: '20px',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1c1400', border: '1.5px solid #ca8a04',
            borderRadius: '10px', padding: '14px 20px', gap: '8px',
          }}>
            {champFlag && (
              <img src={champFlag} width={30} height={22} style={{ objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>
              {champ ?? '?'}
            </span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', textAlign: 'center', letterSpacing: '0.6px' }}>
            PREDICTED CHAMPION
          </span>
        </div>

      </div>

      {/* Footer */}
      <div style={{
        height: `${FOOTER}px`, flexShrink: 0,
        borderTop: '1px solid #0f1e30',
        padding: `0 ${PAD}px`,
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#475569' }}>
          Play free at{' '}
          <span style={{ color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
        </span>
      </div>

    </div>
  ), { width: W, height: H })
}