'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProfileClient({ userId, email, currentDisplayName, memberships = [] }) {
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null)

  // ── NEW: per-league nickname state ─────────────────────────────────────────
  const [nicknames, setNicknames] = useState(() => {
    const map = {}
    for (const m of memberships) {
      map[m.league_id] = m.nickname || ''
    }
    return map
  })
  const [nicknameSaving, setNicknameSaving] = useState(null) // leagueId | null
  const [nicknameSaved, setNicknameSaved] = useState(null)   // leagueId | null
  const [nicknameError, setNicknameError] = useState(null)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) return

    setStatus('saving')
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', userId)

    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('saved')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  // ── NEW: save a single league nickname ────────────────────────────────────
  const handleSaveNickname = async (leagueId) => {
    setNicknameSaving(leagueId)
    setNicknameError(null)

    const supabase = createClient()
    const value = nicknames[leagueId]?.trim() || null

    const { error } = await supabase
      .from('league_members')
      .update({ nickname: value })
      .eq('user_id', userId)
      .eq('league_id', leagueId)

    if (error) {
      setNicknameError(error.message)
    } else {
      setNicknameSaved(leagueId)
      setTimeout(() => setNicknameSaved(null), 3000)
    }
    setNicknameSaving(null)
  }
  // ─────────────────────────────────────────────────────────────────────────

  const isDirty = displayName.trim() !== currentDisplayName
  const isEmpty = displayName.trim() === ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">My Profile</h1>
        <p className="text-gray-400 text-sm">
          Your display name is shown on league standings and to other members.
        </p>
      </div>

      {/* Email — read only */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Email address
        </label>
        <p className="text-gray-300">{email}</p>
        <p className="text-xs text-gray-600 mt-1">
          This is your sign-in email and cannot be changed here.
        </p>
      </div>

      {/* Display name form — UNCHANGED */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setStatus(null) }}
              placeholder="e.g. B Saka"
              maxLength={30}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">{displayName.trim().length}/30 characters</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-400">
              💡 If someone in your league has the same name as you, you can change your name here so everyone can be told apart on the standings.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!isDirty || isEmpty || status === 'saving'}
            className={`w-full py-3 font-bold rounded-lg text-sm transition-colors
              ${status === 'saved'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                : isDirty && !isEmpty
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-950'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
          >
            {status === 'saving' ? 'Saving…'
              : status === 'saved' ? '✓ Name updated'
              : 'Save changes'}
          </button>
        </form>
      </div>

      {status === 'saved' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400">
          ✓ Your display name has been updated. It will appear on all league standings immediately.
        </div>
      )}

      {/* ── NEW: League nicknames ─────────────────────────────────────────── */}
      {memberships.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            League Nicknames
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Set a different name for each league. Leave blank to use your display name.
          </p>

          <div className="space-y-4">
            {memberships.map(m => {
              const leagueId = m.league_id
              const leagueName = m.leagues?.league_name || 'Unknown league'
              const value = nicknames[leagueId] ?? ''
              const isSaving = nicknameSaving === leagueId
              const isSaved = nicknameSaved === leagueId
              const originalNickname = m.nickname || ''
              const isDirtyNickname = value.trim() !== originalNickname

              return (
                <div key={leagueId}>
                  <label className="block text-xs text-gray-500 mb-1 truncate">
                    {leagueName}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={e => setNicknames(prev => ({ ...prev, [leagueId]: e.target.value }))}
                      placeholder={displayName || 'Enter nickname (optional)'}
                      maxLength={30}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                    <button
                      onClick={() => handleSaveNickname(leagueId)}
                      disabled={isSaving || !isDirtyNickname}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 flex-shrink-0
                        ${isSaved
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500 hover:bg-yellow-400 text-gray-950'
                        }`}
                    >
                      {isSaving ? '…' : isSaved ? '✓' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {nicknameError && (
            <p className="text-red-400 text-xs mt-3">{nicknameError}</p>
          )}
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────── */}
    </div>
  )
}