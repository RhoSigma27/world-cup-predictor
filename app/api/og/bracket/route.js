// app/api/og/bracket/route.js
// Shows QF → SF → Final → Champion only. Clean, readable, shareable.
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const flagSrc = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/32x24/${code}.png` : null
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

  // Resolve QF, SF, FINAL
  const rounds = ['QF','SF','FINAL']
  const byRound = {}
  for (const r of rounds) {
    byRound[r] = (fixtures||[])
      .filter(f => f.round === r)
      .sort((a,b) => a.match_number - b.match_number)
      .map(f => {
        const t1 = res(f.slot1, f.match_number)
        const t2 = res(f.slot2, f.match_number)
        const pred = normalisePred(predMap[f.id])
        return { t1, t2, w: pickWinner(pred, t1, t2) }
      })
  }

  const qf = byRound['QF'] || []
  const sf = byRound['SF'] || []
  const final = (byRound['FINAL'] || [])[0]
  const champ = final?.w ?? null
  const champFlag = champ ? flagSrc(champ) : null

  // Left side: QF matches 0-3, SF matches 0-1
  const lQF = qf.slice(0,4)
  const rQF = qf.slice(4)
  const lSF = sf.slice(0,2)
  const rSF = sf.slice(2)
  const lFinal = lSF[0]?.w ?? lSF[1]?.w ?? null
  const rFinal = rSF[0]?.w ?? rSF[1]?.w ?? null

  // Team pill component — tall, readable
  const TeamPill = ({ team, isWinner, height = 38 }) => {
    const resolved = team && team !== 'TBD'
    const f = resolved ? flagSrc(team) : null
    return (
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: '7px', height: `${height}px`, padding: '0 12px',
        background: isWinner ? '#14532d' : resolved ? '#1e293b' : '#0f172a',
        borderLeft: `3px solid ${isWinner ? '#eab308' : resolved ? '#334155' : '#1e293b'}`,
        borderRadius: '4px',
      }}>
        {f && <img src={f} width={22} height={16} style={{ objectFit: 'cover', flexShrink: 0 }} />}
        <span style={{
          fontSize: '13px',
          fontWeight: isWinner ? 700 : resolved ? 500 : 400,
          color: isWinner ? '#86efac' : resolved ? '#e2e8f0' : '#1e293b',
          whiteSpace: 'nowrap',
        }}>
          {resolved ? team : '·'}
        </span>
      </div>
    )
  }

  // A match = 2 team pills + divider
  const Match = ({ m, height = 38, gap = 4 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      <TeamPill team={m.t1} isWinner={m.w === m.t1 && !!m.t1} height={height} />
      <TeamPill team={m.t2} isWinner={m.w === m.t2 && !!m.t2} height={height} />
    </div>
  )

  // A finalist pill (single team, taller)
  const FinalistPill = ({ team }) => {
    const resolved = team && team !== 'TBD'
    const f = resolved ? flagSrc(team) : null
    return (
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: '8px', height: '46px', padding: '0 14px',
        background: resolved ? '#14532d' : '#0f172a',
        borderLeft: `3px solid ${resolved ? '#eab308' : '#1e293b'}`,
        borderRadius: '4px',
      }}>
        {f && <img src={f} width={26} height={19} style={{ objectFit: 'cover', flexShrink: 0 }} />}
        <span style={{
          fontSize: '15px', fontWeight: 700,
          color: resolved ? '#86efac' : '#1e293b',
          whiteSpace: 'nowrap',
        }}>
          {resolved ? team : '·'}
        </span>
      </div>
    )
  }

  // Column of matches, evenly spaced
  const MatchCol = ({ matches, colH, height, gap }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: `${colH}px`, justifyContent: 'space-around' }}>
      {matches.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
          <Match m={m} height={height} gap={gap} />
        </div>
      ))}
    </div>
  )

  const BODY_H = 486  // 630 - 72 header - 36 footer - 36 padding
  const GAP = 4

  return new ImageResponse((
    <div style={{
      width: '1200px', height: '630px',
      background: '#0a0f1a',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        height: '72px', background: '#111827',
        borderBottom: '2px solid #eab308',
        padding: '0 40px', display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{name}</span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
          <span style={{ fontSize: '12px', color: '#4b5563' }}>Play free at</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#eab308' }}>thematchpredictor.com</span>
        </div>
      </div>

      {/* Round labels */}
      <div style={{
        height: '28px', background: '#0d1321',
        display: 'flex', flexDirection: 'row',
        padding: '0 40px', gap: `${GAP}px`,
        alignItems: 'center', flexShrink: 0,
      }}>
        {[
          [220,'QUARTER-FINALS'], [180,'SEMI-FINALS'], [130,'FINAL'],
          [160,''], [130,'FINAL'], [180,'SEMI-FINALS'], [220,'QUARTER-FINALS'],
        ].map(([w, label], i) => (
          <div key={i} style={{
            width: `${w}px`, flexShrink: 0, textAlign: 'center',
            fontSize: '9px', color: '#374151', fontWeight: 600, letterSpacing: '0.5px',
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Bracket body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        padding: '16px 40px', gap: `${GAP}px`, alignItems: 'center',
      }}>

        {/* Left QF: 4 matches */}
        <div style={{ width: '220px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {lQF.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <Match m={m} height={38} gap={4} />
            </div>
          ))}
        </div>

        {/* Left SF: 2 matches */}
        <div style={{ width: '180px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {lSF.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <Match m={m} height={40} gap={4} />
            </div>
          ))}
        </div>

        {/* Left finalist */}
        <div style={{ width: '130px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <FinalistPill team={lFinal} />
        </div>

        {/* Champion */}
        <div style={{
          width: '160px', height: `${BODY_H}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '40px' }}>🏆</span>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: champ ? '#431407' : '#111827',
            border: `2px solid ${champ ? '#eab308' : '#374151'}`,
            borderRadius: '10px', padding: '14px 10px',
            gap: '8px', width: '130px',
          }}>
            {champFlag && (
              <img src={champFlag} width={32} height={24} style={{ objectFit: 'cover' }} />
            )}
            <span style={{
              fontSize: '14px', fontWeight: 800,
              color: champ ? '#fde68a' : '#374151',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {champ ?? '?'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#4b5563', textAlign: 'center' }}>
            predicted champion
          </span>
        </div>

        {/* Right finalist */}
        <div style={{ width: '130px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <FinalistPill team={rFinal} />
        </div>

        {/* Right SF: 2 matches */}
        <div style={{ width: '180px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {rSF.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <Match m={m} height={40} gap={4} />
            </div>
          ))}
        </div>

        {/* Right QF: 4 matches */}
        <div style={{ width: '220px', height: `${BODY_H}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {rQF.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <Match m={m} height={38} gap={4} />
            </div>
          ))}
        </div>

      </div>

      {/* Footer */}
      <div style={{
        height: '36px', borderTop: '1px solid #1e293b',
        padding: '0 40px', display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{ fontSize: '12px', color: '#374151' }}>
          ⚽ World Cup 2026 Predictor
        </span>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          Play free at <span style={{ color: '#eab308', fontWeight: 700 }}>thematchpredictor.com</span>
        </span>
      </div>

    </div>
  ), { width: 1200, height: 630 })
}