// app/api/og/bracket/route.js
// Tested locally with satori. Every div has display:flex. No ticks — colour coding is sufficient.
import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CODES } from '@/lib/worldcup'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

const toFlagEmoji = (code) => {
  if (!code) return ''
  const cc = code.substring(0, 2).toUpperCase()
  return cc.split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}
const fe = (team) => {
  const code = COUNTRY_CODES[String(team || '')]
  return code ? toFlagEmoji(code) : ''
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
        const t1 = String(res(f.slot1, f.match_number) || 'TBD')
        const t2 = String(res(f.slot2, f.match_number) || 'TBD')
        const pred = normalisePred(predMap[f.id])
        const w = String(pickWinner(pred, res(f.slot1, f.match_number), res(f.slot2, f.match_number)) || '')
        return { t1, t2, w, e1: fe(t1), e2: fe(t2) }
      })

  const r16  = buildRound('R16')
  const qf   = buildRound('QF')
  const sf   = buildRound('SF')
  const fin  = buildRound('FINAL')[0] ?? { t1:'TBD', t2:'TBD', w:'', e1:'', e2:'' }
  const champ = fin.w || '?'
  const ce    = fe(champ)

  const bg  = (t, w) => t === champ ? '#1c1400' : (w === t && t !== 'TBD') ? '#0e1e35' : '#0b1525'
  const bl  = (t, w) => t === champ ? '3px solid #ca8a04' : (w === t && t !== 'TBD') ? '2px solid #2a5080' : '2px solid #1a3050'
  const col = (t, w) => t === champ ? '#fde68a' : (w === t && t !== 'TBD') ? '#88aed0' : '#607a95'
  const fw  = (t, w) => (t === champ || (w === t && t !== 'TBD')) ? 700 : 400

  const pill = (t, e, w, h, fs) => ({
    type: 'div',
    props: {
      style: { display:'flex', flexDirection:'row', alignItems:'center', gap:'5px', background:bg(t,w), borderLeft:bl(t,w), height:`${h}px`, paddingLeft:'6px', paddingRight:'6px', borderRadius:'3px' },
      children: [
        { type:'span', props:{ style:{ fontSize:`${fs+2}px` }, children: e||'' } },
        { type:'span', props:{ style:{ color:col(t,w), fontSize:`${fs}px`, whiteSpace:'nowrap', fontWeight:fw(t,w) }, children: t } },
      ]
    }
  })

  return new ImageResponse((
    <div style={{ width:'1200px', height:'630px', background:'#060e1f', display:'flex', flexDirection:'column', padding:'36px', fontFamily:'sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', paddingBottom:'10px', borderBottom:'2px solid #ca8a04' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
          <span style={{ fontSize:'22px', fontWeight:800, color:'white' }}>{name}</span>
          <span style={{ fontSize:'11px', color:'#64748b' }}>My predicted bracket · FIFA World Cup 2026</span>
        </div>
        <span style={{ fontSize:'13px', fontWeight:700, color:'#ca8a04' }}>thematchpredictor.com</span>
      </div>

      {/* Labels */}
      <div style={{ display:'flex', flexDirection:'row', gap:'16px', marginBottom:'4px' }}>
        <div style={{ width:'220px', display:'flex', justifyContent:'center' }}><span style={{ fontSize:'7px', fontWeight:700, color:'#2e4a68', letterSpacing:'0.5px' }}>ROUND OF 16</span></div>
        <div style={{ width:'185px', display:'flex', justifyContent:'center' }}><span style={{ fontSize:'7px', fontWeight:700, color:'#2e4a68', letterSpacing:'0.5px' }}>QUARTER-FINALS</span></div>
        <div style={{ width:'155px', display:'flex', justifyContent:'center' }}><span style={{ fontSize:'7px', fontWeight:700, color:'#2e4a68', letterSpacing:'0.5px' }}>SEMI-FINALS</span></div>
        <div style={{ width:'130px', display:'flex', justifyContent:'center' }}><span style={{ fontSize:'7px', fontWeight:700, color:'#2e4a68', letterSpacing:'0.5px' }}>FINAL</span></div>
        <div style={{ flex:1, display:'flex' }}><span style={{ fontSize:'1px', color:'transparent' }}> </span></div>
      </div>

      {/* Body */}
      <div style={{ display:'flex', flexDirection:'row', gap:'16px', flex:1 }}>

        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-around', width:'220px' }}>
          {r16.map((m, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {pill(m.t1, m.e1, m.w, 20, 10)}
              {pill(m.t2, m.e2, m.w, 20, 10)}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-around', width:'185px' }}>
          {qf.map((m, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {pill(m.t1, m.e1, m.w, 28, 11)}
              {pill(m.t2, m.e2, m.w, 28, 11)}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-around', width:'155px' }}>
          {sf.map((m, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              {pill(m.t1, m.e1, m.w, 38, 13)}
              {pill(m.t2, m.e2, m.w, 38, 13)}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', width:'130px', gap:'4px' }}>
          {pill(fin.t1, fin.e1, fin.w, 52, 14)}
          {pill(fin.t2, fin.e2, fin.w, 52, 14)}
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', borderLeft:'1px solid #1a2a3a' }}>
          <span style={{ fontSize:'36px' }}>🏆</span>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', background:'#1c1400', border:'2px solid #ca8a04', borderRadius:'12px', padding:'16px 28px' }}>
            <span style={{ fontSize:'32px' }}>{ce}</span>
            <span style={{ fontSize:'22px', fontWeight:800, color:'#fde68a', whiteSpace:'nowrap' }}>{champ}</span>
          </div>
          <span style={{ fontSize:'9px', color:'#4b5563', letterSpacing:'0.8px' }}>PREDICTED CHAMPION</span>
        </div>

      </div>
    </div>
  ), { width:1200, height:630 })
}