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

// ─── Pill component ───────────────────────────────────────────────────────────
// variant: 'champ' | 'winner' | 'loser'
// showTick: only on the match winner (not loser, not both finalists)
function Pill({ team, variant, h, fs, showTick = false }) {
  const resolved = team && team !== 'TBD'
  const f = resolved ? flagSrc(team) : null

  const styles = {
    champ:  { bg: '#1c1400', border: '#ca8a04', color: '#fde68a', fw: 700, tickColor: '#ca8a04' },
    winner: { bg: '#0e1e35', border: '#2a5080', color: '#88aed0', fw: 500, tickColor: '#4a80b8' },
    loser:  { bg: '#0b1525', border: '#1a3050', color: '#607a95', fw: 400, tickColor: null },
  }
  const s = styles[variant] || styles.loser

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      height: `${h}px`, padding: '0 8px',
      background: s.bg,
      borderLeft: `${variant === 'champ' ? 3 : 2}px solid ${s.border}`,
      borderRadius: '3px', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
        {f && resolved && (
          <img src={f} width={variant === 'loser' ? 14 : 16} height={variant === 'loser' ? 10 : 12}
            style={{ objectFit: 'cover', flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: `${fs}px`, fontWeight: s.fw,
          color: resolved ? s.color : '#1e3a5f',
          whiteSpace: 'nowrap',
        }}>
          {resolved ? team : '·'}
        </span>
      </div>
      {showTick && s.tickColor && (
        <span style={{ fontSize: `${Math.round(fs * 0.85)}px`, color: s.tickColor, flexShrink: 0, marginLeft: '4px' }}>
          ✓
        </span>
      )}
    </div>
  )
}

// ─── Match component ──────────────────────────────────────────────────────────
function Match({ t1, t2, winner, champPath, h, fs, gap = 3, isFinal = false }) {
  const v1 = champPath === t1 ? 'champ' : winner === t1 && !!t1 ? 'winner' : 'loser'
  const v2 = champPath === t2 ? 'champ' : winner === t2 && !!t2 ? 'winner' : 'loser'

  // In the Final: only the match winner gets a tick
  // In other rounds: the match winner gets a tick
  const tick1 = isFinal ? (winner === t1 && !!t1) : (winner === t1 && !!t1)
  const tick2 = isFinal ? (winner === t2 && !!t2) : (winner === t2 && !!t2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      <Pill team={t1} variant={v1} h={h} fs={fs} showTick={tick1} />
      <Pill team={t2} variant={v2} h={h} fs={fs} showTick={tick2} />
    </div>
  )
}

// ─── Column of matches ────────────────────────────────────────────────────────
function Col({ matches, champPath, bodyH, width, h, fs, gap = 3, isFinal = false }) {
  return (
    <div style={{
      width: `${width}px`, height: `${bodyH}px`, flexShrink: 0,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
    }}>
      {matches.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
          <Match t1={m.t1} t2={m.t2} winner={m.w} champPath={champPath}
            h={h} fs={fs} gap={gap} isFinal={isFinal} />
        </div>
      ))}
    </div>
  )
}

// ─── Gap between columns ──────────────────────────────────────────────────────
function Gap({ w, bodyH }) {
  return <div style={{ width: `${w}px`, height: `${bodyH}px`, flexShrink: 0 }} />
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

  const r16   = buildRound('R16')   // 8 matches
  const qf    = buildRound('QF')    // 4 matches
  const sf    = buildRound('SF')    // 2 matches
  const final = buildRound('FINAL') // 1 match
  const fin   = final[0] ?? { t1: null, t2: null, w: null }

  const champ     = fin.w
  const champFlag = champ ? flagSrc(champ) : null

  // ── Layout constants ──────────────────────────────────────────────────────
  const W = 1200, H = 630
  const HEADER  = 82   // 13%
  const LABELS  = 25   // 4%
  const FOOTER  = 32
  const BODY    = H - HEADER - LABELS - FOOTER  // 491px
  const PAD     = 36   // left/right padding
  const GAP_W   = 32   // gap between columns
  const CONTENT = W - PAD * 2  // 1128px

  // Column widths (px)
  const CW = {
    r16:   Math.round(CONTENT * 0.17),  // 192
    qf:    Math.round(CONTENT * 0.15),  // 169
    sf:    Math.round(CONTENT * 0.12),  // 135
    fin:   Math.round(CONTENT * 0.10),  // 113
  }
  const champW = CONTENT - CW.r16 - CW.qf - CW.sf - CW.fin - GAP_W * 4

  // Pill heights + font sizes per round
  const PH = { r16: 18, qf: 26, sf: 34, fin: 46 }
  const PF = { r16: 10, qf: 11, sf: 13, fin: 14 }

  // Round label font
  const LABEL_FS = 7

  return new ImageResponse((
    <div style={{
      width: `${W}px`, height: `${H}px`,
      background: '#060e1f',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
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

      {/* ── Round labels ── */}
      <div style={{
        height: `${LABELS}px`, background: '#060e1f', flexShrink: 0,
        padding: `0 ${PAD}px`,
        display: 'flex', flexDirection: 'row', alignItems: 'center',
      }}>
        {[
          { w: CW.r16,  label: 'ROUND OF 16' },
          { w: GAP_W,   label: '' },
          { w: CW.qf,   label: 'QUARTER-FINALS' },
          { w: GAP_W,   label: '' },
          { w: CW.sf,   label: 'SEMI-FINALS' },
          { w: GAP_W,   label: '' },
          { w: CW.fin,  label: 'FINAL' },
          { w: GAP_W,   label: '' },
          { w: champW,  label: '' },
        ].map(({ w, label }, i) => (
          <div key={i} style={{ width: `${w}px`, flexShrink: 0, textAlign: 'center' }}>
            <span style={{ fontSize: `${LABEL_FS}px`, fontWeight: 600, color: '#2e4a68', letterSpacing: '0.5px' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Bracket body ── */}
      <div style={{
        flex: 1, flexShrink: 0,
        padding: `6px ${PAD}px 0`,
        display: 'flex', flexDirection: 'row',
      }}>
        <Col matches={r16} champPath={champ} bodyH={BODY} width={CW.r16} h={PH.r16} fs={PF.r16} gap={2} />
        <Gap w={GAP_W} bodyH={BODY} />
        <Col matches={qf} champPath={champ} bodyH={BODY} width={CW.qf} h={PH.qf} fs={PF.qf} gap={2} />
        <Gap w={GAP_W} bodyH={BODY} />
        <Col matches={sf} champPath={champ} bodyH={BODY} width={CW.sf} h={PH.sf} fs={PF.sf} gap={3} />
        <Gap w={GAP_W} bodyH={BODY} />

        {/* Final — 1 match, centred */}
        <div style={{
          width: `${CW.fin}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <Match t1={fin.t1} t2={fin.t2} winner={fin.w} champPath={champ}
            h={PH.fin} fs={PF.fin} gap={4} isFinal={true} />
        </div>

        <Gap w={GAP_W} bodyH={BODY} />

        {/* Champion */}
        <div style={{
          width: `${champW}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          borderLeft: '1px solid #111f33',
          paddingLeft: '20px',
        }}>
          <span style={{ fontSize: '38px' }}>🏆</span>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1c1400',
            border: '1.5px solid #ca8a04',
            borderRadius: '10px',
            padding: '14px 18px', gap: '8px',
          }}>
            {champFlag && (
              <img src={champFlag} width={28} height={21} style={{ objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fde68a', whiteSpace: 'nowrap' }}>
              {champ ?? '?'}
            </span>
          </div>
          <span style={{ fontSize: '8px', color: '#4b5563', textAlign: 'center', letterSpacing: '0.5px' }}>
            PREDICTED CHAMPION
          </span>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{
        height: `${FOOTER}px`, flexShrink: 0,
        borderTop: '1px solid #0f1e30',
        padding: `0 ${PAD}px`,
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: '#2e4a68' }}>⚽ World Cup 2026 Predictor</span>
        <span style={{ fontSize: '11px', color: '#475569' }}>
          Play free at <span style={{ color: '#ca8a04', fontWeight: 700 }}>thematchpredictor.com</span>
        </span>
      </div>

    </div>
  ), { width: W, height: H })
}