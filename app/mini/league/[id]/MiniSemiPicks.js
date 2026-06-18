'use client'
// app/mini/league/[id]/MiniSemiPicks.js

import { useState } from 'react'
import { GROUP_TEAMS, flagUrl } from '@/lib/worldcup'

// Derive sorted flat list of all 48 teams from the single source of truth
const ALL_TEAMS = Object.values(GROUP_TEAMS).flat().sort()

export default function MiniSemiPicks({ miniLeagueId, userId, initialPicks, locked }) {
  const [selected, setSelected] = useState(initialPicks || [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(initialPicks?.length === 4)
  const [error, setError] = useState(null)

  const toggle = (team) => {
    if (locked || saved) return
    setSelected(prev => {
      if (prev.includes(team)) return prev.filter(t => t !== team)
      if (prev.length >= 4) return prev
      return [...prev, team]
    })
  }

  const handleSave = async () => {
    if (selected.length !== 4) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/mini/semi-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miniLeagueId, teams: selected }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong — please try again')
        setSaving(false)
        return
      }
      setSaved(true)
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => setSaved(false)

  if (saved && selected.length === 4) {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map(team => (
            <span
              key={team}
              className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm px-3 py-1.5 rounded-full"
            >
              {flagUrl(team) && (
                <img src={flagUrl(team)} alt="" className="w-4 h-3 object-cover rounded-sm" />
              )}
              {team}
            </span>
          ))}
        </div>
        {!locked && (
          <button
            onClick={handleEdit}
            className="text-sm text-gray-400 hover:text-white transition-colors underline"
          >
            Change picks
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Selection counter */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {selected.length}/4 teams selected
        </p>
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected teams strip */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          {selected.map(team => (
            <button
              key={team}
              onClick={() => toggle(team)}
              className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm px-3 py-1.5 rounded-full hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors"
            >
              {flagUrl(team) && (
                <img src={flagUrl(team)} alt="" className="w-4 h-3 object-cover rounded-sm" />
              )}
              {team} ✕
            </button>
          ))}
        </div>
      )}

      {/* Team grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-80 overflow-y-auto pr-1">
        {ALL_TEAMS.map(team => {
          const isSelected = selected.includes(team)
          const isDisabled = !isSelected && selected.length >= 4
          const flag = flagUrl(team)

          return (
            <button
              key={team}
              onClick={() => toggle(team)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border text-left
                ${isSelected
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 font-medium'
                  : isDisabled
                    ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40 hover:text-white'
                }
              `}
            >
              {flag && (
                <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
              )}
              <span className="truncate">{team}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={selected.length !== 4 || saving}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-xl transition-colors"
      >
        {saving
          ? 'Saving…'
          : selected.length === 4
            ? 'Lock In My Picks →'
            : `Select ${4 - selected.length} more team${4 - selected.length !== 1 ? 's' : ''}`
        }
      </button>
    </div>
  )
}