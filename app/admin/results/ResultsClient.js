'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czechia':'🇨🇿',
  'Canada':'🇨🇦','Italy':'🇮🇹','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Haiti':'🇭🇹',
  'USA':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Türkiye':'🇹🇷',
  'Germany':'🇩🇪','Portugal':'🇵🇹','Colombia':'🇨🇴','Uzbekistan':'🇺🇿',
  'Argentina':'🇦🇷','Belgium':'🇧🇪','Slovenia':'🇸🇮','Egypt':'🇪🇬',
  'Netherlands':'🇳🇱','Chile':'🇨🇱','Iran':'🇮🇷','Curaçao':'🇨🇼',
  'Spain':'🇪🇸','Japan':'🇯🇵','Venezuela':'🇻🇪','Algeria':'🇩🇿',
  'France':'🇫🇷','Senegal':'🇸🇳','Norway':'🇳🇴','Iraq':'🇮🇶',
  'Uruguay':'🇺🇾',"Côte d'Ivoire":'🇨🇮','Poland':'🇵🇱','Cabo Verde':'🇨🇻',
  'Serbia':'🇷🇸','New Zealand':'🇳🇿','Denmark':'🇩🇰','Kenya':'🇰🇪',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦','TBD':'❓'
}
const flag = t => FLAGS[t] || '🏳️'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const ROUND_LABELS = {
  R32:'Round of 32', R16:'Round of 16', QF:'Quarter Finals',
  SF:'Semi Finals', '3RD':'Bronze Final', FINAL:'The Final'
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

export default function ResultsClient({ fixtures }) {
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
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const saveResult = async (fixtureId, home, away) => {
    setSaving(true)
    const { error } = await supabase
      .from('fixtures')
      .update({
        home_score: home,
        away_score: away,
        status: home != null && away != null ? 'complete' : 'scheduled'
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
      .update({
        home_score: null,
        away_score: null,
        status: 'scheduled'
      })
      .eq('id', fixtureId)
    if (!error) {
      setResults(prev => {
        const next = { ...prev }
        delete next[fixtureId]
        return next
      })
      showToast('Result cleared')
    } else {
      showToast('Clear failed', 'error')
    }
    setSaving(false)
  }

  const updateResult = (fixtureId, side, value) => {
    setResults(prev => {
      const current = prev[fixtureId] || {}
      const updated = { ...current, [side]: value }
      const next = { ...prev, [fixtureId]: updated }
      if (updated.home != null && updated.away != null) {
        saveResult(fixtureId, updated.home, updated.away)
      }
      return next
    })
  }

  const groupFixtures = fixtures.filter(f => f.round === 'group')
  const koFixtures = fixtures.filter(f => f.round !== 'group')
  const filteredGroupFixtures = activeGroup === 'ALL'
    ? groupFixtures
    : groupFixtures.filter(f => f.match_group === activeGroup)

  const resultsEntered = fixtures.filter(f => {
    const r = results[f.id]
    return r?.home != null && r?.away != null
  }).length

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
            <th className="px-2 py-2 text-center text-xs text-gray-500 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {fixtureList.map(f => {
            const r = results[f.id] || {}
            const hasResult = r.home != null && r.away != null
            const t1 = f.home_team || f.slot1
            const t2 = f.away_team || f.slot2
            return (
              <tr
                key={f.id}
                className={`border-b border-gray-800/50 ${hasResult ? 'bg-green-500/5' : 'hover:bg-gray-800/30'}`}
              >
                <td className="px-3 py-2 text-gray-600 text-xs">{f.match_number}</td>
                <td className="px-2 py-2 text-right">
                  <span className="font-medium text-white flex items-center justify-end gap-1.5">
                    <span className="hidden sm:inline text-sm">{t1}</span>
                    <span>{flag(t1)}</span>
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
                    <span>{flag(t2)}</span>
                    <span className="hidden sm:inline text-sm">{t2}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                  {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
                {hasResult ? (
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => clearResult(f.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                ) : (
                  <td/>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← Admin
        </Link>
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
        <div className="flex gap-2 mb-6">
          {[['group','Group Stage'],['knockout','Knockout']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors
                ${activeTab === id ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {label}
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
      </div>

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