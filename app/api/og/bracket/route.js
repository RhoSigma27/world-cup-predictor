// app/api/og/bracket/route.js
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const flagUrl = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/20x15/${code}.png` : null
}

function getWinner(pred, t1, t2) {
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
    admin.from('predictions').select('fixture_id, predicted_home, predicted_away').eq('user_id', userId).eq('league_id', leagueId),
  ])

  const displayName = membership?.nickname || profile?.display_name || 'Player'

  const predMap = {}
  for (const p of (predictions || [])) predMap[p.fixture_id] = p

  const byMatchNum = {}
  for (const f of (fixtures || [])) if (f.match_number) byMatchNum[f.match_number] = f

  const tables   = calcGroupTables(predMap, fixtures || [])
  const annexMap = buildAnnexMap(tables)

  const resolve = (slotCode, matchNum) =>
    resolveSlot(slotCode, matchNum, tables, annexMap, predMap, byMatchNum)

  // Build R16 → Final bracket
  const rounds = ['R16', 'QF', 'SF', 'FINAL']
  const bracketByRound = {}
  for (const round of rounds) {
    bracketByRound[round] = (fixtures || [])
      .filter(f => f.round === round)
      .sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1     = resolve(f.slot1, f.match_number)
        const t2     = resolve(f.slot2, f.match_number)
        const pred   = normalisePred(predMap[f.id])
        const winner = getWinner(pred, t1, t2)
        return { t1, t2, winner }
      })
  }

  const r16 = bracketByRound['R16'] || []
  const mid  = Math.floor(r16.length / 2)

  const leftR16  = r16.slice(0, mid)   // 8 matches
  const rightR16 = r16.slice(mid)      // 8 matches
  const leftQF   = (bracketByRound['QF']    || []).slice(0, 4)
  const rightQF  = (bracketByRound['QF']    || []).slice(4)
  const leftSF   = (bracketByRound['SF']    || []).slice(0, 2)
  const rightSF  = (bracketByRound['SF']    || []).slice(2)
  const finalMatch = (bracketByRound['FINAL'] || [])[0] ?? null
  const champion   = finalMatch?.winner ?? null
  const champFlag  = champion ? flagUrl(champion) : null

  // ── Layout constants ───────────────────────────────────────────────────────
  const W = 1200, H = 630
  const HEADER_H = 72
  const FOOTER_H = 24
  const BODY_H   = H - HEADER_H - FOOTER_H  // 534

  // Column widths
  const CW = { r16: 168, qf: 136, sf: 112, fin: 96, center: 104 }
  // Total: 168+136+112+96+104+96+112+136+168 = 1128, padded by 36px each side = 1200 ✓

  // Row heights for each round (match height = 2 rows + gap for R16)
  const ROW_H  = { r16: 24, qf: 26, sf: 30, fin: 36 }
  const GAP_H  = 3   // gap between the two team rows in a match
  const MATCH_H = (round) => ROW_H[round] * 2 + GAP_H

  // ── Team row component ─────────────────────────────────────────────────────
  const TeamBox = ({ team, isWinner, h }) => {
    const flag = team ? flagUrl(team) : null
    const resolved = team && team !== 'TBD'
    return (
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '5px',
        height:         `${h}px`,
        padding:        '0 8px',
        background:     isWinner ? '#14532d' : resolved ? '#1e2535' : '#141824',
        borderLeft:     `2px solid ${isWinner ? '#eab308' : resolved ? '#374151' : '#1f2937'}`,
        borderRadius:   '3px',
        overflow:       'hidden',
        flexShrink:     0,
      }}>
        {flag && resolved && (
          <img src={flag} width={16} height={12} style={{ objectFit: 'cover', flexShrink: 0 }} />
        )}
        <span style={{
          fontSize:   '11px',
          fontWeight: isWinner ? 700 : 400,
          color:      isWinner ? '#86efac' : resolved ? '#d1d5db' : '#374151',
          whiteSpace: 'nowrap',
          overflow:   'hidden',
        }}>
          {resolved ? team : '·'}
        </span>
      </div>
    )
  }

  // A match = 2 TeamBox rows
  const Match = ({ m, round, showBoth = true }) => {
    const h = ROW_H[round]
    const w = m.winner
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP_H}px` }}>
        {showBoth
          ? <>
              <TeamBox team={m.t1} isWinner={w === m.t1 && !!m.t1} h={h} />
              <TeamBox team={m.t2} isWinner={w === m.t2 && !!m.t2} h={h} />
            </>
          : <TeamBox team={m.winner ?? m.t1} isWinner={!!m.winner} h={h} />
        }
      </div>
    )
  }

  // A column: evenly spaced matches over the full body height
  const Col = ({ matches, round, width, showBoth = true }) => (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      justifyContent: 'space-around',
      width:          `${width}px`,
      height:         `${BODY_H}px`,
      flexShrink:     0,
    }}>
      {matches.map((m, i) => (
        <Match key={i} m={m} round={round} showBoth={showBoth} />
      ))}
    </div>
  )

  // Single-winner column (Final entrant)
  const FinCol = ({ team, side }) => {
    const h   = ROW_H.fin
    const flag = team ? flagUrl(team) : null
    const resolved = team && team !== 'TBD'
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        width:          `${CW.fin}px`,
        height:         `${BODY_H}px`,
        flexShrink:     0,
      }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '5px',
          height:     `${h}px`,
          padding:    '0 8px',
          background: resolved ? '#14532d' : '#141824',
          borderLeft: `2px solid ${resolved ? '#eab308' : '#1f2937'}`,
          borderRadius: '3px',
          overflow:   'hidden',
        }}>
          {flag && resolved && (
            <img src={flag} width={16} height={12} style={{ objectFit: 'cover', flexShrink: 0 }} />
          )}
          <span style={{
            fontSize:   '12px',
            fontWeight: 700,
            color:      resolved ? '#86efac' : '#374151',
            whiteSpace: 'nowrap',
          }}>
            {resolved ? team : '·'}
          </span>
        </div>
      </div>
    )
  }

  const leftFinalist  = leftSF[0]?.winner  ?? leftSF[1]?.winner  ?? null
  const rightFinalist = rightSF[0]?.winner ?? rightSF[1]?.winner ?? null

  return new ImageResponse(
    (
      <div style={{
        width:       `${W}px`,
        height:      `${H}px`,
        background:  '#0d1117',
        display:     'flex',
        flexDirection:'column',
        fontFamily:  'system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          height:         `${HEADER_H}px`,
          background:     '#161b27',
          borderBottom:   '2px solid #eab308',
          padding:        '0 36px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexShrink:     0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{displayName}</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>My predicted bracket · FIFA World Cup 2026</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>Play free at</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#eab308' }}>thematchpredictor.com</span>
          </div>
        </div>

        {/* Bracket body */}
        <div style={{
          flex:     1,
          display:  'flex',
          padding:  '8px 36px 0',
          gap:      '3px',
          overflow: 'hidden',
        }}>
          {/* LEFT: R16 → QF → SF → Final */}
          <Col matches={leftR16} round="r16" width={CW.r16} />
          <Col matches={leftQF}  round="qf"  width={CW.qf}  />
          <Col matches={leftSF}  round="sf"  width={CW.sf}  />
          <FinCol team={leftFinalist} side="left" />

          {/* CENTER: champion */}
          <div style={{
            width:          `${CW.center}px`,
            flexShrink:     0,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '8px',
          }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              background:     champion ? '#431407' : '#161b27',
              border:         `1.5px solid ${champion ? '#eab308' : '#374151'}`,
              borderRadius:   '8px',
              padding:        '10px 8px',
              gap:            '6px',
              width:          '88px',
            }}>
              {champFlag && (
                <img src={champFlag} width={24} height={18} style={{ objectFit: 'cover' }} />
              )}
              <span style={{
                fontSize:  '12px',
                fontWeight:800,
                color:     champion ? '#fde68a' : '#374151',
                textAlign: 'center',
                whiteSpace:'nowrap',
              }}>
                {champion ?? '?'}
              </span>
            </div>
            <span style={{ fontSize: '9px', color: '#4b5563', textAlign: 'center', lineHeight: 1.2 }}>
              predicted{'\n'}champion
            </span>
          </div>

          {/* RIGHT: Final → SF → QF → R16 */}
          <FinCol team={rightFinalist} side="right" />
          <Col matches={rightSF}  round="sf"  width={CW.sf}  />
          <Col matches={rightQF}  round="qf"  width={CW.qf}  />
          <Col matches={rightR16} round="r16" width={CW.r16} />
        </div>

        {/* Round labels footer */}
        <div style={{
          height:   `${FOOTER_H}px`,
          display:  'flex',
          padding:  '0 36px',
          gap:      '3px',
          alignItems:'center',
          flexShrink:0,
        }}>
          {[
            { w: CW.r16,    label: 'ROUND OF 16' },
            { w: CW.qf,     label: 'QUARTER-FINALS' },
            { w: CW.sf,     label: 'SEMI-FINALS' },
            { w: CW.fin,    label: 'FINAL' },
            { w: CW.center, label: '' },
            { w: CW.fin,    label: 'FINAL' },
            { w: CW.sf,     label: 'SEMI-FINALS' },
            { w: CW.qf,     label: 'QUARTER-FINALS' },
            { w: CW.r16,    label: 'ROUND OF 16' },
          ].map(({ w, label }, i) => (
            <div key={i} style={{
              width:      `${w}px`,
              flexShrink: 0,
              textAlign:  'center',
              fontSize:   '8px',
              color:      '#374151',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}