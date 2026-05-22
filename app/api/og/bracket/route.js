// app/api/og/bracket/route.js
// Resolves a user's predicted KO bracket and renders it as a shareable image.
// Shows R16 → QF → SF → Final → Champion, 8 teams per side.

import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import {
  calcGroupTables,
  buildAnnexMap,
  resolveSlot,
  normalisePred,
} from '@/lib/bracketEngine'

export const runtime = 'edge'

function flagUrl(team) {
  const code = COUNTRY_CODES[team]
  return code ? `https://flagcdn.com/20x15/${code}.png` : null
}

// Resolve a winner from a prediction + two slot teams
function getWinner(pred, t1, t2) {
  if (!pred || pred.home == null || pred.away == null) return null
  if (pred.home > pred.away) return t1
  if (pred.away > pred.home) return t2
  return null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const leagueId = searchParams.get('leagueId')
  if (!userId || !leagueId) return new Response('Missing params', { status: 400 })

  const admin = createAdminClient()

  // Fetch user display name
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  // Check for nickname in this league
  const { data: membership } = await admin
    .from('league_members')
    .select('nickname')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single()

  const displayName = membership?.nickname || profile?.display_name || 'Player'

  // Fetch all fixtures
  const { data: fixtures } = await admin
    .from('fixtures')
    .select('*')
    .order('match_number', { ascending: true })

  if (!fixtures?.length) return new Response('No fixtures', { status: 500 })

  // Fetch user predictions for this league
  const { data: predictions } = await admin
    .from('predictions')
    .select('fixture_id, predicted_home, predicted_away')
    .eq('user_id', userId)
    .eq('league_id', leagueId)

  // Build pred map (server format: predicted_home/predicted_away)
  const predMap = {}
  for (const p of (predictions || [])) predMap[p.fixture_id] = p

  // Build fixture index by match number
  const byMatchNum = {}
  for (const f of fixtures) if (f.match_number) byMatchNum[f.match_number] = f

  // Resolve bracket
  const tables = calcGroupTables(predMap, fixtures)
  const annexMap = buildAnnexMap(tables)

  const resolve = (slotCode, matchNum) =>
    resolveSlot(slotCode, matchNum, tables, annexMap, predMap, byMatchNum)

  // Build R16 through Final
  const rounds = ['R16', 'QF', 'SF', 'FINAL']
  const bracketByRound = {}
  for (const round of rounds) {
    bracketByRound[round] = fixtures
      .filter(f => f.round === round)
      .sort((a, b) => a.match_number - b.match_number)
      .map(f => {
        const t1 = resolve(f.slot1, f.match_number)
        const t2 = resolve(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        const winner = getWinner(pred, t1, t2)
        return { t1, t2, winner }
      })
  }

  // Split R16 into left (first 8) and right (last 8) — 16 R16 fixtures total
  const r16 = bracketByRound['R16'] || []
  const leftR16  = r16.slice(0, 8)
  const rightR16 = r16.slice(8)
  const leftQF   = (bracketByRound['QF']    || []).slice(0, 4)
  const rightQF  = (bracketByRound['QF']    || []).slice(4)
  const leftSF   = (bracketByRound['SF']    || []).slice(0, 2)
  const rightSF  = (bracketByRound['SF']    || []).slice(2)
  const finalMatch = (bracketByRound['FINAL'] || [])[0]
  const champion = finalMatch?.winner ?? null

  // ─── Render helpers ──────────────────────────────────────────────────────

  const COL_W = { r16: 170, qf: 140, sf: 120, fin: 110 }
  const BODY_H = 510
  const GAP = 8

  // A single team row inside the bracket
  const TeamRow = ({ team, isWinner, height }) => {
    const flag = team ? flagUrl(team) : null
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: isWinner ? '#1c2a0e' : '#1a1f2e',
        borderLeft: `3px solid ${isWinner ? '#eab308' : '#2d3748'}`,
        borderRadius: '4px',
        padding: '0 10px',
        height: `${height}px`,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {flag && team && (
          <img src={flag} style={{ width: '20px', height: '15px', objectFit: 'cover', flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: '13px',
          fontWeight: isWinner ? 700 : 400,
          color: isWinner ? '#f0fdf4' : team ? '#d1d5db' : '#4b5563',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {team ?? 'TBD'}
        </span>
      </div>
    )
  }

  // A column of match slots for one round, one side
  // matches: [{t1, t2, winner}]
  // teamFn: which team to show (t1 for left side teams advancing right, t2 for right side)
  const BracketColumn = ({ matches, width, rowH, gap, showBoth = true }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      width: `${width}px`,
      height: `${BODY_H}px`,
      flexShrink: 0,
    }}>
      {matches.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
          {showBoth ? (
            <>
              <TeamRow team={m.t1} isWinner={m.winner === m.t1 && !!m.t1} height={rowH} />
              <TeamRow team={m.t2} isWinner={m.winner === m.t2 && !!m.t2} height={rowH} />
            </>
          ) : (
            <TeamRow team={m.winner ?? m.t1} isWinner={!!m.winner} height={rowH} />
          )}
        </div>
      ))}
    </div>
  )

  const champFlag = champion ? flagUrl(champion) : null

  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        background: '#0f1117',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          background: '#1a1f2e',
          borderBottom: '3px solid #eab308',
          height: '80px',
          padding: '0 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: 'white' }}>{displayName}</span>
            <span style={{ fontSize: '14px', color: '#9ca3af', marginTop: '2px' }}>
              My predicted bracket · FIFA World Cup 2026
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Play free at</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#eab308' }}>thematchpredictor.com</span>
          </div>
        </div>

        {/* Bracket body */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
          padding: '10px 8px',
          gap: '4px',
          overflow: 'hidden',
        }}>
          {/* LEFT SIDE: R16 → QF → SF → Final */}
          <BracketColumn matches={leftR16} width={COL_W.r16} rowH={28} gap={3} showBoth />
          <BracketColumn matches={leftQF}  width={COL_W.qf}  rowH={29} gap={3} showBoth />
          <BracketColumn matches={leftSF}  width={COL_W.sf}  rowH={32} gap={4} showBoth />
          <BracketColumn
            matches={[{ t1: finalMatch?.t1, t2: null, winner: finalMatch?.t1 && (finalMatch?.winner === finalMatch?.t1 || !finalMatch?.winner) ? finalMatch?.t1 : null }].map(() => ({ t1: leftSF[0]?.winner ?? null, t2: null, winner: leftSF[0]?.winner ?? null }))}
            width={COL_W.fin} rowH={36} gap={0} showBoth={false}
          />

          {/* CENTER: champion */}
          <div style={{
            width: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '36px' }}>🏆</span>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: champion ? '#451a03' : '#1a1f2e',
              border: `2px solid ${champion ? '#eab308' : '#374151'}`,
              borderRadius: '10px',
              padding: '10px 12px',
              gap: '6px',
              minWidth: '90px',
            }}>
              {champFlag && (
                <img src={champFlag} style={{ width: '28px', height: '21px', objectFit: 'cover' }} />
              )}
              <span style={{
                fontSize: '14px',
                fontWeight: 800,
                color: champion ? '#fde68a' : '#6b7280',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {champion ?? '?'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>predicted champion</span>
          </div>

          {/* RIGHT SIDE: Final → SF → QF → R16 */}
          <BracketColumn
            matches={[{ t1: rightSF[0]?.winner ?? null, t2: null, winner: rightSF[0]?.winner ?? null }]}
            width={COL_W.fin} rowH={36} gap={0} showBoth={false}
          />
          <BracketColumn matches={rightSF}  width={COL_W.sf}  rowH={32} gap={4} showBoth />
          <BracketColumn matches={rightQF}  width={COL_W.qf}  rowH={29} gap={3} showBoth />
          <BracketColumn matches={rightR16} width={COL_W.r16} rowH={28} gap={3} showBoth />
        </div>

        {/* Round labels at bottom */}
        <div style={{
          display: 'flex',
          padding: '0 8px 8px',
          gap: '4px',
          flexShrink: 0,
        }}>
          {[
            { w: COL_W.r16, label: 'Round of 16' },
            { w: COL_W.qf,  label: 'Quarter-Finals' },
            { w: COL_W.sf,  label: 'Semi-Finals' },
            { w: COL_W.fin, label: 'Final' },
            { w: 120,       label: '' },
            { w: COL_W.fin, label: 'Final' },
            { w: COL_W.sf,  label: 'Semi-Finals' },
            { w: COL_W.qf,  label: 'Quarter-Finals' },
            { w: COL_W.r16, label: 'Round of 16' },
          ].map(({ w, label }, i) => (
            <div key={i} style={{
              width: `${w}px`,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: '10px',
              color: '#4b5563',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}