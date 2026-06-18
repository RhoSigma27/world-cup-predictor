'use client'
// app/admin/mini-leagues/MiniLeaguesClient.js

import { useState } from 'react'
import Link from 'next/link'

const TIER_CONFIG = {
  hobby:      { label: 'Hobby',      cls: 'text-gray-400 bg-gray-800 border-gray-600' },
  enthusiast: { label: 'Enthusiast', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  fanatic:    { label: 'Fanatic',    cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  business:   { label: 'Business',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
}

function TierBadge({ tier, isComped }) {
  if (isComped) return (
    <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-500/10 border-green-500/30">
      ⭐ Comped
    </span>
  )
  const cfg = TIER_CONFIG[tier ?? 'hobby'] ?? TIER_CONFIG.hobby
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function MiniLeaguesClient({ leagues: initialLeagues }) {
  const [leagues, setLeagues] = useState(initialLeagues)
  const [expanded, setExpanded] = useState({})
  const [togglingComp, setTogglingComp] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleToggleComp = async (leagueId, currentlyComped) => {
    setTogglingComp(leagueId)
    try {
      const res = await fetch('/api/admin/mini-toggle-comp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, comped: !currentlyComped }),
      })
      const data = await res.json()
      if (!res.ok) showToast(data.error || 'Failed to update', 'error')
      else {
        setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, is_comped: !currentlyComped } : l))
        showToast(currentlyComped ? 'Comp removed' : '⭐ League comped')
      }
    } catch { showToast('Something went wrong', 'error') }
    finally { setTogglingComp(null) }
  }

  const handleDelete = async (leagueId) => {
    setDeleting(leagueId)
    try {
      const res = await fetch('/api/admin/mini-delete-league', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      })
      const data = await res.json()
      if (!res.ok) showToast(data.error || 'Failed to delete', 'error')
      else { setLeagues(prev => prev.filter(l => l.id !== leagueId)); showToast('League deleted') }
    } catch { showToast('Something went wrong', 'error') }
    finally { setDeleting(null); setConfirmDelete(null) }
  }

  const totalMembers = leagues.reduce((acc, l) => acc + l.memberCount, 0)

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
        <span className="text-gray-600">/</span>
        <span className="font-bold text-yellow-400">All Mini-Game Leagues</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{leagues.length}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Mini Leagues</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{totalMembers}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Total Members</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {totalMembers > 0 ? (totalMembers / leagues.length).toFixed(1) : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Avg per League</div>
          </div>
        </div>

        {/* League list */}
        <div className="space-y-3">
          {leagues.map(league => (
            <div key={league.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-4">

                {/* Logo / initial */}
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-400 text-sm flex-shrink-0">
                  {league.league_name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-white">{league.league_name}</h2>
                    <code className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded font-mono">
                      {league.invite_code}
                    </code>
                    <TierBadge tier={league.tier} isComped={league.is_comped} />
                    <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">🥊 Mini</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">
                      Admin: <span className="text-gray-300">{league.profiles?.display_name}</span>
                      <span className="text-gray-600 ml-1">({league.profiles?.email})</span>
                    </span>
                    <span className="text-xs text-gray-600">
                      Created {new Date(league.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => toggleExpand(league.id)}
                    className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors text-sm"
                  >
                    <span className="text-yellow-400 font-bold">{league.memberCount}</span>
                    <span className="text-gray-400">{league.memberCount === 1 ? 'member' : 'members'}</span>
                    <span className="text-gray-600 text-xs ml-1">{expanded[league.id] ? '▲' : '▼'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleComp(league.id, league.is_comped)}
                    disabled={togglingComp === league.id}
                    className={`text-xs px-3 py-1.5 border rounded-lg transition-colors disabled:opacity-50
                      ${league.is_comped
                        ? 'bg-green-500/20 hover:bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-gray-800 hover:bg-green-500/10 text-gray-500 hover:text-green-400 border-gray-700 hover:border-green-500/30'
                      }`}
                  >
                    {togglingComp === league.id ? '…' : league.is_comped ? '⭐ Comped' : 'Comp'}
                  </button>

                  {confirmDelete === league.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Sure?</span>
                      <button
                        onClick={() => handleDelete(league.id)}
                        disabled={deleting === league.id}
                        className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === league.id ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(league.id)}
                      className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-red-500/20 text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>

              {expanded[league.id] && (
                <div className="border-t border-gray-800 px-5 py-3">
                  {league.members.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No members yet</p>
                  ) : (
                    <div className="space-y-0">
                      {league.members.map(m => (
                        <div key={m.user_id} className="py-2 border-b border-gray-800/50 last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                                {m.display_name_effective?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-white">{m.display_name_effective}</span>
                                  {m.user_id === league.admin_id && (
                                    <span className="text-xs text-yellow-400">⭐ Admin</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-600">{m.profiles?.email}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600">
                              Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {leagues.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <div className="text-4xl mb-3">🥊</div>
            <p>No mini-game leagues yet</p>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}

      {confirmDelete && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setConfirmDelete(null)} />}
    </main>
  )
}