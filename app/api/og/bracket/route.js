// app/api/og/bracket/route.js
// Left-to-right bracket: R16 → QF → SF → Final → Champion
// Match ordering: M89-96 (R16), M97-100 (QF), M101-102 (SF), M104 (Final)
// Vertical alignment: space-around on each column means QF midpoints
// automatically align with pairs of R16 matches, etc.

import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const flagSrc = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/24x18/${code}.png` : null
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

  // Build each KO round in match-number order
  const buildRound = (roundCode) =>
    (fixtures || [])
      .filter(f => f.round === roundCode)
      .sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1   = res(f.slot1, f.match_number)
        const t2   = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        const w    = pickWinner(pred, t1, t2)
        return { t1, t2, w }
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
  const HEADER = 70
  const LABELS = 24
  const FOOTER = 32
  const BODY   = H - HEADER - LABELS - FOOTER  // 504px

  // Column widths — total must fit 1200px
  // 36px padding each side + 4 gaps × 5px = 92px overhead → 1108px for cols
  const CW = { r16: 205, qf: 200, sf: 188, fin: 175, champ: 140 }
  // Total: 205+200+188+175+140 = 908 < 1108 — comfortable

  // Pill heights grow with each round (more space per match)
  const PH = { r16: 24, qf: 30, sf: 38, fin: 46 }
  const PG = { r16: 3,  qf: 4,  sf: 5,  fin: 6  } // gap between 2 pills

  // ── Sub-components ─────────────────────────────────────────────────────────

  // One team pill
  function Pill({ team, isWinner, h, isChamp = false }) {
    const ok   = team && team !== 'TBD'
    const f    = ok ? flagSrc(team) : null
    const bg   = isChamp ? '#451a03'
               : isWinner ? '#14532d'
               : ok ? '#1e293b'
               : '#111827'
    const border = isChamp ? '#f59e0b'
                 : isWinner ? '#16a34a'
                 : ok ? '#2d3748'
                 : '#1e293b'
    const textColor = isChamp ? '#fde68a'
                    : isWinner ? '#86efac'
                    : ok ? '#e2e8f0'
                    : '#1e293b'
    return (
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: '6px', height: `${h}px`, padding: '0 10px',
        background: bg,
        borderLeft: `3px solid ${border}`,
        borderRadius: '4px', overflow: 'hidden', flexShrink: 0,
      }}>
        {f && <img src={f} width={h > 30 ? 20 : 16} height={h > 30 ? 15 : 12}
          style={{ objectFit: 'cover', flexShrink: 0 }} />}
        <span style={{
          fontSize: `${h > 38 ? 14 : h > 28 ? 12 : 11}px`,
          fontWeight: isWinner || isChamp ? 700 : ok ? 500 : 400,
          color: textColor, whiteSpace: 'nowrap',
        }}>
          {ok ? team : '·'}
        </span>
      </div>
    )
  }

  // One match = 2 pills stacked
  function Match({ m, round }) {
    const h = PH[round], g = PG[round]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${g}px` }}>
        <Pill team={m.t1} isWinner={m.w === m.t1 && !!m.t1} h={h} />
        <Pill team={m.t2} isWinner={m.w === m.t2 && !!m.t2} h={h} />
      </div>
    )
  }

  // A full column of matches, evenly distributed vertically
  function Col({ matches, round, width }) {
    return (
      <div style={{
        width: `${width}px`, height: `${BODY}px`, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
      }}>
        {matches.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            <Match m={m} round={round} />
          </div>
        ))}
      </div>
    )
  }

  // Round label
  function Label({ width, text }) {
    return (
      <div style={{
        width: `${width}px`, flexShrink: 0, textAlign: 'center',
        fontSize: '9px', fontWeight: 600, color: '#4b5563', letterSpacing: '0.4px',
      }}>
        {text}
      </div>
    )
  }

  return new ImageResponse((
    <div style={{
      width: `${W}px`, height: `${H}px`,
      background: '#0a0f1a',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{
        height: `${HEADER}px`, background: '#111827',
        borderBottom: '2px solid #eab308',
        padding: '0 36px', flexShrink: 0,
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{name}</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            My predicted bracket · FIFA World Cup 2026
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: '#4b5563' }}>Play free at</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#eab308' }}>
            thematchpredictor.com
          </span>
        </div>
      </div>

      {/* ── Round labels ── */}
      <div style={{
        height: `${LABELS}px`, background: '#0d1117',
        padding: '0 36px', flexShrink: 0,
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', gap: '5px',
      }}>
        <Label width={CW.r16}   text="ROUND OF 16" />
        <Label width={CW.qf}    text="QUARTER-FINALS" />
        <Label width={CW.sf}    text="SEMI-FINALS" />
        <Label width={CW.fin}   text="FINAL" />
        <Label width={CW.champ} text="" />
      </div>

      {/* ── Bracket body ── */}
      <div style={{
        flex: 1, padding: '8px 36px', flexShrink: 0,
        display: 'flex', flexDirection: 'row',
        alignItems: 'stretch', gap: '5px',
      }}>

        {/* R16 — 8 matches */}
        <Col matches={r16} round="r16" width={CW.r16} />

        {/* QF — 4 matches: midpoints align with R16 pairs */}
        <Col matches={qf} round="qf" width={CW.qf} />

        {/* SF — 2 matches: midpoints align with QF pairs */}
        <Col matches={sf} round="sf" width={CW.sf} />

        {/* Final — 1 match: centred in BODY height */}
        <div style={{
          width: `${CW.fin}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${PG.fin}px` }}>
            <Pill team={fin.t1} isWinner={fin.w === fin.t1 && !!fin.t1} h={PH.fin} />
            <Pill team={fin.t2} isWinner={fin.w === fin.t2 && !!fin.t2} h={PH.fin} />
          </div>
        </div>

        {/* Champion box */}
        <div style={{
          width: `${CW.champ}px`, height: `${BODY}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '36px' }}>🏆</span>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: champ ? '#451a03' : '#111827',
            border: `2px solid ${champ ? '#f59e0b' : '#374151'}`,
            borderRadius: '10px', padding: '14px 10px', gap: '8px',
            width: '124px',
          }}>
            {champFlag && (
              <img src={champFlag} width={28} height={21}
                style={{ objectFit: 'cover' }} />
            )}
            <span style={{
              fontSize: '13px', fontWeight: 800,
              color: champ ? '#fde68a' : '#374151',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {champ ?? '?'}
            </span>
          </div>
          <span style={{ fontSize: '9px', color: '#4b5563', textAlign: 'center' }}>
            predicted champion
          </span>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{
        height: `${FOOTER}px`, flexShrink: 0,
        borderTop: '1px solid #1e293b',
        padding: '0 36px',
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: '#374151' }}>
          ⚽ World Cup 2026 Predictor
        </span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Play free at{' '}
          <span style={{ color: '#eab308', fontWeight: 700 }}>thematchpredictor.com</span>
        </span>
      </div>

    </div>
  ), { width: W, height: H })
}