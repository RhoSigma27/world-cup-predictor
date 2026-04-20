'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// ─── constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES = {
  'Mexico':'mx','South Africa':'za','South Korea':'kr','Czechia':'cz',
  'Canada':'ca','Italy':'it','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Scotland':'gb-sct','Haiti':'ht',
  'USA':'us','Paraguay':'py','Australia':'au','Türkiye':'tr',
  'Germany':'de','Portugal':'pt','Colombia':'co','Uzbekistan':'uz',
  'Argentina':'ar','Belgium':'be','Slovenia':'si','Egypt':'eg',
  'Netherlands':'nl','Chile':'cl','Iran':'ir','Curaçao':'cw',
  'Spain':'es','Japan':'jp','Venezuela':'ve','Algeria':'dz',
  'France':'fr','Senegal':'sn','Norway':'no','Iraq':'iq',
  'Uruguay':'uy',"Côte d'Ivoire":'ci','Poland':'pl','Cabo Verde':'cv',
  'Serbia':'rs','New Zealand':'nz','Denmark':'dk','Kenya':'ke',
  'England':'gb-eng','Croatia':'hr','Ghana':'gh','Panama':'pa',
}
const flag = t => {
  const code = COUNTRY_CODES[t]
  return code ? `https://flagcdn.com/24x18/${code}.png` : null
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

const GROUP_TEAMS = {
  A:['Mexico','South Africa','South Korea','Czechia'],
  B:['Canada','Italy','Qatar','Switzerland'],
  C:['Brazil','Morocco','Scotland','Haiti'],
  D:['USA','Paraguay','Australia','Türkiye'],
  E:['Germany','Portugal','Colombia','Uzbekistan'],
  F:['Argentina','Belgium','Slovenia','Egypt'],
  G:['Netherlands','Chile','Iran','Curaçao'],
  H:['Spain','Japan','Venezuela','Algeria'],
  I:['France','Senegal','Norway','Iraq'],
  J:['Uruguay',"Côte d'Ivoire",'Poland','Cabo Verde'],
  K:['Serbia','New Zealand','Denmark','Kenya'],
  L:['England','Croatia','Ghana','Panama'],
}

const ROUND_LABELS = {
  R32:'Round of 32', R16:'Round of 16', QF:'Quarter Finals',
  SF:'Semi Finals', '3RD':'Bronze Final', FINAL:'The Final',
}

// ─── group table calculation (for override display) ───────────────────────────

function calcGroupTables(results, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const r = results[f.id]
    if (!r || r.home == null || r.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.gf += r.home; t1.ga += r.away; t1.gd = t1.gf - t1.ga
    t2.gf += r.away; t2.ga += r.home; t2.gd = t2.gf - t2.ga
    if (r.home > r.away)      { t1.pts += 3 }
    else if (r.away > r.home) { t2.pts += 3 }
    else                      { t1.pts += 1; t2.pts += 1 }
  }
  for (const g of GROUPS) {
    tables[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  }
  return tables
}

function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─── small components ─────────────────────────────────────────────────────────

function FlagImg({ team }) {
  const src = flag(team)
  if (!src) return null
  return <img src={src} alt={team} className="w-5 h-3 object-cover rounded-sm flex-shrink-0 inline-block" />
}

function ScoreInput({ value, onChange }) {
  return (
    <input
      type="number" min="0" max="99"
      value={value ?? ''} placeholder="–"
      className="w-10 text-center py-1 rounded-md text-sm font-bold outline-none bg-gray-700 border border-yellow-500/50 text-white focus:border-yellow-500 transition-colors"
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
    />
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ResultsClient({ fixtures, masterExtras: initialMasterExtras }) {
  const [activeTab, setActiveTab] = useState('group')
  const [activeGroup, setActiveGroup] = useState('A')
  const [results, setResults] = useState(() => {
    const map = {}
    for (const f of fixtures) {
      if (f.home_score != null || f.away_score != null) {
        map[f.id] = { home: f.home_score, away: f.away_score }
      }
    }
    return map
  })
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  // Override state — null means "use auto", otherwise a Set of 8 group letters
  const [overrideGroups, setOverrideGroups] = useState(() => {
    const saved = initialMasterExtras?.third_place_override
    return saved ? new Set(saved) : null
  })
  // Working copy while the admin is editing (before save)
  const [draftOverride, setDraftOverride] = useState(() => {
    const saved = initialMasterExtras?.third_place_override
    return saved ? new Set(saved) : null
  })
  const [overrideOpen, setOverrideOpen] = useState(false)

  const supabaseRef = useRef(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ── result entry ─────────────────────────────────────────────────────────────

  const saveResult = async (fixtureId, home, away) => {
    setSaving(true)
    const { error } = await supabase
      .from('fixtures')
      .update({
        home_score: home, away_score: away,
        status: home != null && away != null ? 'complete' : 'scheduled',
      })
      .eq('id', fixtureId)
    setSaving(false)
    if (error) showToast('Save failed — ' + error.message, 'error')
    else showToast('✓ Saved')
  }

  const clearResult = async (fixtureId) => {
    setSaving(true)
    const { error } = await supabase
      .from('fixtures')
      .update({ home_score: null, away_score: null, status: 'scheduled' })
      .eq('id', fixtureId)
    if (!error) {
      setResults(prev => { const next = { ...prev }; delete next[fixtureId]; return next })
      showToast('Result cleared')
    } else {
      showToast('Clear failed', 'error')
    }
    setSaving(false)
  }

  const updateResult = (fixtureId, side, value) => {
    setResults(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const r = updated[fixtureId]
      if (r.home != null && r.away != null) saveResult(fixtureId, r.home, r.away)
      return updated
    })
  }

  // ── 3rd place override ───────────────────────────────────────────────────────

  const toggleDraftGroup = (g) => {
    setDraftOverride(prev => {
      const next = prev ? new Set(prev) : new Set()
      if (next.has(g)) next.delete(g)
      else if (next.size < 8) next.add(g)
      return next
    })
  }

  const saveOverride = async () => {
    if (!draftOverride || draftOverride.size !== 8) {
      showToast('Select exactly 8 groups', 'error')
      return
    }
    const value = [...draftOverride].sort()
    // master_extras at the admin level is a single global row — update it directly
    const { error } = await supabase
      .from('master_extras')
      .update({ third_place_override: value, updated_at: new Date().toISOString() })
      .not('id', 'is', null)
    if (!error) {
      setOverrideGroups(new Set(value))
      showToast('Override saved ✓')
    } else {
      showToast('Save failed — ' + error.message, 'error')
    }
  }

  const clearOverride = async () => {
    const { error } = await supabase
      .from('master_extras')
      .update({ third_place_override: null, updated_at: new Date().toISOString() })
      .not('id', 'is', null)
    if (!error) {
      setOverrideGroups(null)
      setDraftOverride(null)
      showToast('Override cleared — using auto-computed ranking')
    } else {
      showToast('Clear failed — ' + error.message, 'error')
    }
  }

  // ── derived data ─────────────────────────────────────────────────────────────

  const groupFixtures = fixtures.filter(f => f.round === 'group')
  const koFixtures    = fixtures.filter(f => f.round !== 'group')
  const filteredGroupFixtures = activeGroup === 'ALL'
    ? groupFixtures
    : groupFixtures.filter(f => f.match_group === activeGroup)

  const resultsEntered = fixtures.filter(f => {
    const r = results[f.id]; return r?.home != null && r?.away != null
  }).length

  const groupResultsDone = GROUPS.every(g =>
    groupFixtures.filter(f => f.match_group === g)
      .every(f => results[f.id]?.home != null && results[f.id]?.away != null)
  )

  // Auto-computed 3rd place table from actual results
  const tables = calcGroupTables(results, fixtures)
  const allThirds = calcAllThirds(tables)
  const autoTop8 = allThirds.slice(0, 8).map(t => t.group)

  // Effective top-8 (override if set, else auto)
  const effectiveTop8 = overrideGroups ? [...overrideGroups].sort() : autoTop8

  // ── render helpers ────────────────────────────────────────────────────────────

  const renderTable = (fixtureList) => (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-yellow-500/5">
            <th className="px-3 py-2 text-left text-xs text-gray-500 w-8">#</th>
            <th className="px-2 py-2 text-right text-xs text-gray-500">Home</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-8">H</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-4">–</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-8">A</th>
            <th className="px-2 py-2 text-left text-xs text-gray-500">Away</th>
            <th className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">Date</th>
            <th className="w-6"/>
          </tr>
        </thead>
        <tbody>
          {fixtureList.map(f => {
            const r = results[f.id] || {}
            const hasResult = r.home != null && r.away != null
            const t1 = f.home_team || f.slot1
            const t2 = f.away_team || f.slot2
            return (
              <tr key={f.id} className={`border-b border-gray-800/50 ${hasResult ? 'bg-green-500/5' : 'hover:bg-gray-800/30'}`}>
                <td className="px-3 py-2 text-gray-600 text-xs">{f.match_number}</td>
                <td className="px-2 py-2 text-right">
                  <span className="font-medium text-white flex items-center justify-end gap-1.5">
                    <span className="hidden sm:inline text-sm">{t1}</span>
                    {flag(t1) && <img src={flag(t1)} alt={t1} className="w-5 h-3 object-cover rounded-sm"/>}
                  </span>
                </td>
                <td className="px-1 py-2 text-center">
                  <ScoreInput value={r.home} onChange={v => updateResult(f.id, 'home', v)}/>
                </td>
                <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                <td className="px-1 py-2 text-center">
                  <ScoreInput value={r.away} onChange={v => updateResult(f.id, 'away', v)}/>
                </td>
                <td className="px-2 py-2">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    {flag(t2) && <img src={flag(t2)} alt={t2} className="w-5 h-3 object-cover rounded-sm"/>}
                    <span className="hidden sm:inline text-sm">{t2}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                  {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-2 py-2 text-center">
                  {hasResult && (
                    <button onClick={() => clearResult(f.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">✕</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // ── 3rd place override panel ──────────────────────────────────────────────────

  const renderOverridePanel = () => {
    const draft = draftOverride ?? new Set(autoTop8)

    return (
      <div className="space-y-6">

        {/* Status banner */}
        {overrideGroups ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-amber-400 text-sm font-medium">
              ⚠️ Override active — 3rd place slots are using your manual selection, not the auto-computed ranking.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Active override: Groups {[...overrideGroups].sort().join(', ')}
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">
              🤖 Using auto-computed 3rd place ranking. Use the override below if fair play points, FIFA ranking, or drawing of lots changed which 8 groups qualified.
            </p>
          </div>
        )}

        {/* Auto-computed table */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Auto-Computed 3rd Place Ranking
          </h3>
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-yellow-500/5">
                  <th className="px-3 py-2 text-left text-xs text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Team</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Grp</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Pts</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">GD</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">GF</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {allThirds.map((row, i) => (
                  <tr key={row.group} className={`border-b border-gray-800/50 ${i < 8 ? 'bg-green-500/5' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-white">
                      <span className="flex items-center gap-1.5">
                        {flag(row.team) && <img src={flag(row.team)} alt={row.team} className="w-5 h-3 object-cover rounded-sm flex-shrink-0"/>}
                        <span className="hidden sm:inline">{row.team}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-yellow-400 text-xs">{row.group}</td>
                    <td className="px-2 py-2 text-center text-gray-300 text-xs font-bold">{row.pts}</td>
                    <td className={`px-2 py-2 text-center text-xs ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {row.gd > 0 ? '+' : ''}{row.gd}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400 text-xs">{row.gf}</td>
                    <td className="px-2 py-2 text-center text-xs">
                      {i < 8
                        ? <span className="text-green-400 font-bold">✓ Qualifies</span>
                        : <span className="text-gray-600">Eliminated</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!groupResultsDone && (
            <p className="text-xs text-gray-600 mt-2 text-center">Complete all 72 group results to see the final ranking</p>
          )}
        </div>

        {/* Manual override selector */}
        <div>
          <button
            onClick={() => setOverrideOpen(o => !o)}
            className="flex items-center gap-2 text-sm font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <span>{overrideOpen ? '▼' : '▶'}</span>
            Manual Override
            {overrideGroups && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Active</span>}
          </button>

          {overrideOpen && (
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-1">
                Select exactly 8 groups whose 3rd-place teams actually qualified.
              </p>
              <p className="text-gray-600 text-xs mb-4">
                Use this when fair play points, FIFA ranking, or drawing of lots changed the outcome from the auto-computed ranking above.
              </p>

              {/* Group toggles */}
              <div className="flex flex-wrap gap-2 mb-4">
                {GROUPS.map(g => {
                  const isSelected = draft.has(g)
                  const team = tables[g]?.[2]?.team ?? `3rd in ${g}`
                  const isAutoTop8 = autoTop8.includes(g)
                  return (
                    <button
                      key={g}
                      onClick={() => toggleDraftGroup(g)}
                      title={team}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border
                        ${isSelected
                          ? 'bg-yellow-500 text-gray-950 border-yellow-500'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                        }`}
                    >
                      <span className="block text-sm">{g}</span>
                      <span className={`block text-xs mt-0.5 font-normal truncate max-w-16 ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>
                        {team.split(' ').slice(-1)[0]}
                      </span>
                      {isAutoTop8 && !isSelected && (
                        <span className="block text-xs text-blue-400 mt-0.5">auto ✓</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selection count */}
              <p className={`text-sm font-medium mb-4 ${draft.size === 8 ? 'text-green-400' : 'text-amber-400'}`}>
                {draft.size}/8 groups selected
                {draft.size === 8 && ' ✓'}
                {draft.size < 8 && ` — select ${8 - draft.size} more`}
                {draft.size > 8 && ' — too many selected'}
              </p>

              {/* Show selected groups */}
              {draft.size > 0 && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Selected groups:</p>
                  <p className="text-sm font-bold text-white">{[...draft].sort().join(', ')}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={saveOverride}
                  disabled={draft.size !== 8}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-lg text-sm transition-colors"
                >
                  Save Override
                </button>
                {overrideGroups && (
                  <button
                    onClick={clearOverride}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-sm transition-colors border border-gray-700"
                  >
                    Clear Override (use auto)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Effective result summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Effective 3rd Place Qualifiers
          </p>
          <div className="flex flex-wrap gap-2">
            {effectiveTop8.map(g => {
              const team = tables[g]?.[2]?.team
              return (
                <div key={g} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
                  {team && flag(team) && <img src={flag(team)} alt={team} className="w-5 h-3 object-cover rounded-sm"/>}
                  <span className="text-xs font-bold text-yellow-400">{g}</span>
                  {team && <span className="text-xs text-gray-400">{team}</span>}
                </div>
              )
            })}
          </div>
          {overrideGroups && (
            <p className="text-xs text-amber-400 mt-2">⚠️ Manual override active</p>
          )}
        </div>

      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{resultsEntered}/104 entered</span>
          {saving && <span className="text-xs text-yellow-400 animate-pulse">Saving…</span>}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm font-medium">
            ⚡ Results entered here update scores for <strong>all leagues</strong> instantly.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            ['group',    'Group Stage'],
            ['knockout', 'Knockout'],
            ['override', '3rd Place Slots'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors relative
                ${activeTab === id ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {label}
              {id === 'override' && overrideGroups && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full"/>
              )}
            </button>
          ))}
        </div>

        {/* Group stage */}
        {activeTab === 'group' && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {GROUPS.map(g => {
                const gf = groupFixtures.filter(f => f.match_group === g)
                const done = gf.every(f => results[f.id]?.home != null && results[f.id]?.away != null)
                return (
                  <button key={g} onClick={() => setActiveGroup(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                      ${activeGroup === g ? 'bg-yellow-500 text-gray-950'
                        : done ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {g} {done ? '✓' : ''}
                  </button>
                )
              })}
              <button onClick={() => setActiveGroup('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                  ${activeGroup === 'ALL' ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400'}`}>
                All
              </button>
            </div>
            {renderTable(filteredGroupFixtures)}
          </>
        )}

        {/* Knockout */}
        {activeTab === 'knockout' && (
          <div className="space-y-6">
            {['R32','R16','QF','SF','3RD','FINAL'].map(round => {
              const roundFixtures = koFixtures.filter(f => f.round === round)
              if (!roundFixtures.length) return null
              return (
                <div key={round}>
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">
                    {ROUND_LABELS[round]}
                  </h3>
                  {renderTable(roundFixtures)}
                </div>
              )
            })}
          </div>
        )}

        {/* 3rd place override */}
        {activeTab === 'override' && renderOverridePanel()}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}