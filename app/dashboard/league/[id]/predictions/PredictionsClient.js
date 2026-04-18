'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const LOCK_DATE = new Date('2026-06-11T19:00:00Z')
const isLocked = () => new Date() >= LOCK_DATE

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

const flag = (t) => {
  const code = COUNTRY_CODES[t]
  if (!code) return null
  return `https://flagcdn.com/24x18/${code}.png`
}

const shortName = (name) => {
  const shorts = {
    'South Africa':'S Africa',
    'South Korea':'S Korea',
    'Switzerland':'Swiss',
    'Australia':'Austral',
    'Uzbekistan':'Uzbek',
    'Netherlands':'Nether',
    'Argentina':'Argent',
    'Slovenia':'Sloven',
    'Venezuela':'Venezu',
    "Côte d'Ivoire":'C Ivoire',
    'Cabo Verde':'C Verde',
    'New Zealand':'NZ',
  }
  return shorts[name] || (name.length > 8 ? name.slice(0, 7) : name)
}

function getResult(s1, s2) {
  if (s1 > s2) return 'H'
  if (s2 > s1) return 'A'
  return 'D'
}

function calcGroupTables(predictions, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, pts: 0
    }))
  }
  const groupFixtures = fixtures.filter(f => f.round === 'group')
  for (const f of groupFixtures) {
    const pred = predictions[f.id]
    if (!pred || pred.home == null || pred.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += pred.home; t1.ga += pred.away
    t2.gf += pred.away; t2.ga += pred.home
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga
    if (pred.home > pred.away) {
      t1.won++; t1.pts += 3; t2.lost++
    } else if (pred.away > pred.home) {
      t2.won++; t2.pts += 3; t1.lost++
    } else {
      t1.drawn++; t1.pts++; t2.drawn++; t2.pts++
    }
  }
  for (const g of GROUPS) {
    tables[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  }
  return tables
}

function ScoreInput({ value, onChange, disabled }) {
  const empty = value == null || value === ''
  const highlight = !disabled && empty
  return (
    <input
      type="number" min="0" max="99"
      value={value ?? ''} placeholder="–"
      disabled={disabled}
      className={`w-9 text-center py-1 rounded-md text-sm font-bold outline-none transition-colors
        ${disabled
          ? 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
          : highlight
            ? 'bg-yellow-500/10 border border-yellow-500/50 text-white'
            : 'bg-gray-700 border border-gray-600 text-white'
        }`}
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
    />
  )
}

function GroupTablePanel({ predictions, fixtures, activeGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const displayGroup = selectedGroup || (activeGroup === 'ALL' ? 'A' : activeGroup)
  const tables = calcGroupTables(predictions, fixtures)
  return (
    <div className="p-4 overflow-y-auto">
      <h3 className="font-bold text-yellow-400 mb-3 text-sm uppercase tracking-wider">
        Group Tables
      </h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {GROUPS.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`text-xs px-2 py-1 rounded font-bold transition-colors
              ${displayGroup === g
                ? 'bg-yellow-500 text-gray-950'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Group {displayGroup}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">#</th>
              <th className="text-left px-3 py-2 text-gray-500">Team</th>
              <th className="px-2 py-2 text-gray-500">P</th>
              <th className="px-2 py-2 text-gray-500">GD</th>
              <th className="px-2 py-2 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {tables[displayGroup]?.map((row, i) => (
              <tr key={row.team} className={`border-b border-gray-800/50 ${i < 2 ? 'bg-green-500/5' : ''}`}>
                <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-white">
                  <span className="flex items-center gap-1">
                    {flag(row.team) && (
                      <img
                        src={flag(row.team)}
                        alt={row.team}
                        className="w-5 h-3 object-cover rounded-sm flex-shrink-0"
                      />
                    )}
                    <span className="truncate max-w-24">{row.team}</span>
                    {i < 2 && <span className="text-green-400 text-xs">✓</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-gray-400">{row.played}</td>
                <td className={`px-2 py-2 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PredictionsClient({
  league, fixtures, existingPredictions,
  extrasPrediction, userId, profile, leagueId
}) {
  const locked = isLocked()
  const [activeGroup, setActiveGroup] = useState('A')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [toast, setToast] = useState(null)
  const [showStarPicker, setShowStarPicker] = useState(false)
  const [showMobileTables, setShowMobileTables] = useState(false)
  const saveTimers = useRef({})
  const supabaseRef = useRef(null)

  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  const [predictions, setPredictions] = useState(() => {
    const map = {}
    for (const p of existingPredictions) {
      map[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away }
    }
    return map
  })

  const [extras, setExtras] = useState({
    redcards: extrasPrediction?.predicted_red_cards ?? null,
    goals: extrasPrediction?.predicted_total_goals ?? null,
  })

  const [starPick, setStarPick] = useState(extrasPrediction?.star_pick ?? null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const savePrediction = useCallback(async (fixtureId, home, away) => {
    if (locked) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        league_id: leagueId,
        fixture_id: fixtureId,
        predicted_home: home,
        predicted_away: away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id,fixture_id' })
    if (error) showToast('Save failed', 'error')
    else setSaveStatus('saved')
  }, [locked, userId, leagueId, supabase])

  const updatePrediction = (fixtureId, side, value) => {
    if (locked) return
    setPredictions(prev => {
      const current = prev[fixtureId] || {}
      const updated = { ...current, [side]: value }
      const next = { ...prev, [fixtureId]: updated }
      if (updated.home != null && updated.away != null) {
        setSaveStatus('unsaved')
        if (saveTimers.current[fixtureId]) clearTimeout(saveTimers.current[fixtureId])
        saveTimers.current[fixtureId] = setTimeout(() => {
          savePrediction(fixtureId, updated.home, updated.away)
        }, 800)
      }
      return next
    })
  }

  const saveExtras = async (newExtras, newStarPick) => {
    const { error } = await supabase
      .from('extras_predictions')
      .upsert({
        user_id: userId,
        league_id: leagueId,
        predicted_red_cards: newExtras.redcards,
        predicted_total_goals: newExtras.goals,
        star_pick: newStarPick,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id' })
    if (!error) showToast('Extras saved ✓')
    else showToast('Save failed', 'error')
  }

  const groupFixtures = fixtures.filter(f => f.round === 'group')
  const filteredFixtures = activeGroup === 'ALL'
    ? groupFixtures
    : groupFixtures.filter(f => f.match_group === activeGroup)

  const totalGroupPredictions = groupFixtures.filter(f => {
    const p = predictions[f.id]
    return p?.home != null && p?.away != null
  }).length

  const allGroupsDone = totalGroupPredictions === 72
  const progressPct = Math.round((totalGroupPredictions / 72) * 100)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/dashboard/league/${leagueId}`} className="text-gray-400 hover:text-white text-sm">
          ← {league?.league_name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{totalGroupPredictions}/72</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saved' ? 'bg-green-400' :
              saveStatus === 'saving' ? 'bg-yellow-400' : 'bg-red-400'
            }`}/>
            <span className="text-xs text-gray-500">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            locked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {locked ? '🔒 Locked' : '🔓 Open'}
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left — match grid */}
        <div className="flex-1 p-4 pb-24 overflow-x-auto">

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Group stage predictions</span>
              <span>{progressPct}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Group tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {GROUPS.map(g => {
              const gFixtures = groupFixtures.filter(f => f.match_group === g)
              const done = gFixtures.every(f => {
                const p = predictions[f.id]
                return p?.home != null && p?.away != null
              })
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                    ${activeGroup === g
                      ? 'bg-yellow-500 text-gray-950'
                      : done
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  {g} {done ? '✓' : ''}
                </button>
              )
            })}
            <button
              onClick={() => setActiveGroup('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${activeGroup === 'ALL'
                  ? 'bg-yellow-500 text-gray-950'
                  : 'bg-gray-800 text-gray-400'
                }`}
            >
              All
            </button>
          </div>

          {/* Match table */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-yellow-500/5">
                  <th className="px-2 py-2 text-right text-xs text-gray-500">Home</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">H</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-4">–</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">A</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-500">Away</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredFixtures.map(f => {
                  const pred = predictions[f.id] || {}
                  const bothFilled = pred.home != null && pred.away != null
                  return (
                    <tr
                      key={f.id}
                      className={`border-b border-gray-800/50 transition-colors ${bothFilled ? '' : 'hover:bg-gray-800/50'}`}
                    >
                      <td className="px-2 py-2 text-right">
                        <span className="font-medium text-white flex items-center justify-end gap-1 flex-nowrap">
                          <span className="hidden sm:inline text-sm">{f.home_team}</span>
                          <span className="sm:hidden text-xs">{shortName(f.home_team)}</span>
                          {flag(f.home_team) && (
                            <img
                              src={flag(f.home_team)}
                              alt={f.home_team}
                              className="w-5 h-3 object-cover rounded-sm flex-shrink-0"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput
                          value={pred.home}
                          onChange={v => updatePrediction(f.id, 'home', v)}
                          disabled={locked}
                        />
                      </td>
                      <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput
                          value={pred.away}
                          onChange={v => updatePrediction(f.id, 'away', v)}
                          disabled={locked}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-white flex items-center gap-1 flex-nowrap">
                          {flag(f.away_team) && (
                            <img
                              src={flag(f.away_team)}
                              alt={f.away_team}
                              className="w-5 h-3 object-cover rounded-sm flex-shrink-0"
                            />
                          )}
                          <span className="hidden sm:inline text-sm">{f.away_team}</span>
                          <span className="sm:hidden text-xs">{shortName(f.away_team)}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                        {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Knockout unlock message */}
          {!allGroupsDone && (
            <div className="mt-6 p-6 bg-gray-900 border border-dashed border-gray-700 rounded-xl text-center">
              <div className="text-3xl mb-2">🔐</div>
              <p className="text-gray-400 text-sm">
                Complete all 72 group stage predictions to unlock the knockout bracket
              </p>
              <p className="text-gray-600 text-xs mt-1">
                {72 - totalGroupPredictions} predictions remaining
              </p>
            </div>
          )}

          {/* Star pick — always visible */}
          {!locked && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">⭐ Star Pick</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Choose a team — they score double points all tournament
                  </p>
                </div>
                <button
                  onClick={() => setShowStarPicker(true)}
                  className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors flex-shrink-0 ml-3"
                >
                  {starPick ? `⭐ ${starPick}` : 'Choose team'}
                </button>
              </div>
              {starPick && (
                <button
                  onClick={() => { setStarPick(null); saveExtras(extras, null) }}
                  className="mt-3 text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Remove star pick
                </button>
              )}
            </div>
          )}

          {/* Extras — unlocks after all group predictions done */}
          {allGroupsDone && (
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-1">🎯 Tournament Extras</h3>
              <p className="text-gray-500 text-sm mb-4">Closest answer wins 50 points each</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                    Total Red Cards
                  </label>
                  <input
                    type="number" min="0"
                    value={extras.redcards ?? ''}
                    disabled={locked}
                    placeholder="e.g. 24"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    onChange={e => setExtras(prev => ({
                      ...prev,
                      redcards: e.target.value === '' ? null : parseInt(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                    Total Goals (excl. pens)
                  </label>
                  <input
                    type="number" min="0"
                    value={extras.goals ?? ''}
                    disabled={locked}
                    placeholder="e.g. 142"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    onChange={e => setExtras(prev => ({
                      ...prev,
                      goals: e.target.value === '' ? null : parseInt(e.target.value)
                    }))}
                  />
                </div>
              </div>
              {!locked && (
                <button
                  onClick={() => saveExtras(extras, starPick)}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg text-sm transition-colors"
                >
                  Save Extras
                </button>
              )}
            </div>
          )}

        </div>

        {/* Mobile group tables toggle button */}
        <div className="lg:hidden fixed bottom-16 right-4 z-30">
          <button
            onClick={() => setShowMobileTables(prev => !prev)}
            className="bg-yellow-500 text-gray-950 font-bold rounded-full px-4 py-2 text-sm shadow-lg"
          >
            📊 Tables
          </button>
        </div>

        {/* Mobile group tables drawer */}
        {showMobileTables && (
          <div className="lg:hidden fixed inset-0 bg-gray-950 z-40 overflow-y-auto pb-20">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="font-bold text-yellow-400">Group Tables</span>
              <button
                onClick={() => setShowMobileTables(false)}
                className="text-gray-400 text-xl"
              >
                ✕
              </button>
            </div>
            <GroupTablePanel
              predictions={predictions}
              fixtures={fixtures}
              activeGroup={activeGroup}
            />
          </div>
        )}

        {/* Desktop group tables */}
        <div className="hidden lg:block w-72 border-l border-gray-800 bg-gray-900/50">
          <GroupTablePanel
            predictions={predictions}
            fixtures={fixtures}
            activeGroup={activeGroup}
          />
        </div>

      </div>{/* closes flex div */}

      {/* Star picker modal */}
      {showStarPicker && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowStarPicker(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full max-h-96 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">⭐ Choose Your Star Pick</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(GROUP_TEAMS).flat().sort().map(team => (
                <button
                  key={team}
                  onClick={() => { setStarPick(team); setShowStarPicker(false); saveExtras(extras, team) }}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2
                    ${starPick === team
                      ? 'bg-yellow-500 text-gray-950 font-bold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {flag(team) && (
                    <img
                      src={flag(team)}
                      alt={team}
                      className="w-5 h-3 object-cover rounded-sm flex-shrink-0"
                    />
                  )}
                  <span className="truncate">{team}</span>
                </button>
              ))}
            </div>
            {starPick && (
              <button
                onClick={() => { setStarPick(null); setShowStarPicker(false); saveExtras(extras, null) }}
                className="w-full mt-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50 transition-colors"
              >
                Remove Star Pick
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}
        >
          {toast.msg}
        </div>
      )}

    </div>
  )
}