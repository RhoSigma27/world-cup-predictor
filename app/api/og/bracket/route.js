// app/api/og/bracket/route.js
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const flag = (team) => {
  const code = COUNTRY_CODES?.[team]
  return code ? `https://flagcdn.com/16x12/${code}.png` : null
}

function winner(pred, t1, t2) {
  if (!pred || pred.home == null || pred.away == null) return null
  if (pred.home > pred.away) return t1
  if (pred.away > pred.home) return t2
  return null
}

// Single team pill
function pill(team, isWinner) {
  const resolved = team && team !== 'TBD'
  const f = resolved ? flag(team) : null
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      gap: '4px', height: '22px', padding: '0 7px',
      background: isWinner ? '#14532d' : resolved ? '#1e2535' : '#111827',
      borderLeft: `2px solid ${isWinner ? '#eab308' : resolved ? '#2d3748' : '#1f2937'}`,
      borderRadius: '3px', overflow: 'hidden',
    }}>
      {f && <img src={f} width={14} height={10} style={{ objectFit: 'cover', flexShrink: 0 }} />}
      <span style={{
        fontSize: '10.5px', fontWeight: isWinner ? 700 : 400,
        color: isWinner ? '#86efac' : resolved ? '#d1d5db' : '#1f2937',
        whiteSpace: 'nowrap',
      }}>
        {resolved ? team : '·'}
      </span>
    </div>
  )
}

// A match block: two pills stacked
function match(t1, t2, w, showBoth = true) {
  if (!showBoth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {pill(w ?? t1, !!w)}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {pill(t1, w === t1 && !!t1)}
      {pill(t2, w === t2 && !!t2)}
    </div>
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
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

  const tables = calcGroupTables(predMap, fixtures || [])
  const annexMap = buildAnnexMap(tables)
  const res = (slot, num) => resolveSlot(slot, num, tables, annexMap, predMap, byNum)

  const rounds = ['R16','QF','SF','FINAL']
  const byRound = {}
  for (const r of rounds) {
    byRound[r] = (fixtures||[]).filter(f=>f.round===r).sort((a,b)=>a.match_number-b.match_number)
      .map(f => {
        const t1=res(f.slot1,f.match_number), t2=res(f.slot2,f.match_number)
        const pred=normalisePred(predMap[f.id])
        return { t1, t2, w: winner(pred,t1,t2) }
      })
  }

  const r16 = byRound['R16']||[]
  const mid  = Math.floor(r16.length/2)
  const lR16=r16.slice(0,mid), rR16=r16.slice(mid)
  const lQF=(byRound['QF']||[]).slice(0,4), rQF=(byRound['QF']||[]).slice(4)
  const lSF=(byRound['SF']||[]).slice(0,2), rSF=(byRound['SF']||[]).slice(2)
  const fin=(byRound['FINAL']||[])[0]
  const champ=fin?.w??null
  const lFin=lSF[0]?.w??lSF[1]?.w??null
  const rFin=rSF[0]?.w??rSF[1]?.w??null
  const cf=champ?flag(champ):null

  // Column: array of match blocks evenly spaced
  function col(matches, showBoth=true) {
    return matches.map((m,i) => (
      <div key={i} style={{ display:'flex', flexDirection:'column', flex:1, justifyContent:'center' }}>
        {match(m.t1, m.t2, m.w, showBoth)}
      </div>
    ))
  }

  function singleCol(team) {
    return (
      <div style={{ display:'flex', flexDirection:'column', flex:1, justifyContent:'center' }}>
        {pill(team, !!team)}
      </div>
    )
  }

  const CW = { r16:162, qf:132, sf:110, fin:92, center:108 }
  const BODY_H = 530

  return new ImageResponse((
    <div style={{ width:'1200px', height:'630px', background:'#0d1117', display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ height:'72px', background:'#161b27', borderBottom:'2px solid #eab308', padding:'0 36px', display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
          <span style={{ fontSize:'22px', fontWeight:800, color:'white' }}>{name}</span>
          <span style={{ fontSize:'12px', color:'#6b7280' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px' }}>
          <span style={{ fontSize:'11px', color:'#4b5563' }}>Play free at</span>
          <span style={{ fontSize:'16px', fontWeight:700, color:'#eab308' }}>thematchpredictor.com</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'row', padding:'8px 36px 0', gap:'3px', overflow:'hidden' }}>

        {/* Left R16 */}
        <div style={{ width:`${CW.r16}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(lR16)}
        </div>
        {/* Left QF */}
        <div style={{ width:`${CW.qf}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(lQF)}
        </div>
        {/* Left SF */}
        <div style={{ width:`${CW.sf}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(lSF)}
        </div>
        {/* Left finalist */}
        <div style={{ width:`${CW.fin}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {singleCol(lFin)}
        </div>

        {/* Champion */}
        <div style={{ width:`${CW.center}px`, height:`${BODY_H}px`, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ fontSize:'30px' }}>🏆</span>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background: champ?'#431407':'#161b27', border:`1.5px solid ${champ?'#eab308':'#374151'}`, borderRadius:'8px', padding:'10px 8px', gap:'6px', width:'86px' }}>
            {cf && <img src={cf} width={22} height={16} style={{ objectFit:'cover' }} />}
            <span style={{ fontSize:'11px', fontWeight:800, color:champ?'#fde68a':'#374151', textAlign:'center', whiteSpace:'nowrap' }}>
              {champ??'?'}
            </span>
          </div>
          <span style={{ fontSize:'9px', color:'#4b5563', textAlign:'center' }}>predicted champion</span>
        </div>

        {/* Right finalist */}
        <div style={{ width:`${CW.fin}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {singleCol(rFin)}
        </div>
        {/* Right SF */}
        <div style={{ width:`${CW.sf}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(rSF)}
        </div>
        {/* Right QF */}
        <div style={{ width:`${CW.qf}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(rQF)}
        </div>
        {/* Right R16 */}
        <div style={{ width:`${CW.r16}px`, height:`${BODY_H}px`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {col(rR16)}
        </div>

      </div>

      {/* Footer labels */}
      <div style={{ height:'28px', display:'flex', flexDirection:'row', padding:'0 36px', gap:'3px', alignItems:'center', flexShrink:0 }}>
        {[
          [CW.r16,'ROUND OF 16'],[CW.qf,'QUARTER-FINALS'],[CW.sf,'SEMI-FINALS'],
          [CW.fin,'FINAL'],[CW.center,''],[CW.fin,'FINAL'],
          [CW.sf,'SEMI-FINALS'],[CW.qf,'QUARTER-FINALS'],[CW.r16,'ROUND OF 16'],
        ].map(([w,label],i) => (
          <div key={i} style={{ width:`${w}px`, flexShrink:0, textAlign:'center', fontSize:'8px', color:'#374151', fontWeight:600, letterSpacing:'0.3px' }}>
            {label}
          </div>
        ))}
      </div>

    </div>
  ), { width:1200, height:630 })
}