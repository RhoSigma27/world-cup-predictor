'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ── NEW: Logo uploader ────────────────────────────────────────────────────────

function LogoUpload({ leagueId, initialLogoUrl }) {
  const [preview, setPreview] = useState(initialLogoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setSuccessMsg(null)

    if (file.size > 512000) {
      setError('File too large — maximum 500 KB')
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Use JPEG, PNG, WebP or GIF')
      return
    }

    // Instant preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('leagueId', leagueId)
      fd.append('file', file)
      const res = await fetch('/api/league-admin/upload-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
        setPreview(initialLogoUrl || null)
      } else {
        setSuccessMsg('Logo updated ✓')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch {
      setError('Upload failed — please try again')
      setPreview(initialLogoUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex items-start gap-5">
      {/* Current logo / placeholder */}
      <div className="flex-shrink-0">
        {preview ? (
          <img
            src={preview}
            alt="League logo"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center text-2xl text-gray-600">
            🏆
          </div>
        )}
      </div>

      {/* Upload area */}
      <div className="flex-1">
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-yellow-500/50 rounded-xl p-4 cursor-pointer transition-colors text-center group"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Uploading…</span>
            </div>
          ) : (
            <>
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📁</div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-gray-600 mt-0.5">JPEG, PNG, WebP, GIF · max 500 KB</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {successMsg && <p className="text-green-400 text-xs mt-2">{successMsg}</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LeagueAdminClient({ league: initialLeague, members: initialMembers, currentUserId }) {
  const [league, setLeague] = useState(initialLeague)
  const [members, setMembers] = useState(initialMembers)
  const [toast, setToast] = useState(null)

  // Form states
  const [leagueName, setLeagueName] = useState(initialLeague.league_name)
  const [notice, setNotice] = useState(initialLeague.notice || '')
  const [renamingMember, setRenamingMember] = useState(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [confirmChangeAdmin, setConfirmChangeAdmin] = useState(null)
  const [saving, setSaving] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const api = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json().then(data => ({ ok: res.ok, data }))
  }

  // ── Rename league ──────────────────────────────────────────────────────────
  const handleRenameLeague = async () => {
    if (!leagueName.trim() || leagueName.trim() === league.league_name) return
    setSaving('league-name')
    const { ok, data } = await api('/api/league-admin/rename-league', {
      leagueId: league.id, name: leagueName.trim()
    })
    if (ok) {
      setLeague(prev => ({ ...prev, league_name: leagueName.trim() }))
      showToast('League renamed successfully')
    } else {
      showToast(data.error || 'Failed to rename league', 'error')
    }
    setSaving(null)
  }

  // ── Save notice ────────────────────────────────────────────────────────────
  const handleSaveNotice = async () => {
    setSaving('notice')
    const { ok, data } = await api('/api/league-admin/set-notice', {
      leagueId: league.id, notice: notice.trim()
    })
    if (ok) {
      setLeague(prev => ({ ...prev, notice: notice.trim() }))
      showToast('Notice saved')
    } else {
      showToast(data.error || 'Failed to save notice', 'error')
    }
    setSaving(null)
  }

  // ── Rename member ──────────────────────────────────────────────────────────
  const handleRenameMember = async (userId) => {
    if (!newMemberName.trim()) return
    setSaving(`rename-${userId}`)
    const { ok, data } = await api('/api/league-admin/rename-member', {
      leagueId: league.id, userId, name: newMemberName.trim()
    })
    if (ok) {
      setMembers(prev => prev.map(m =>
        m.user_id === userId
          ? { ...m, profiles: { ...m.profiles, display_name: newMemberName.trim() } }
          : m
      ))
      setRenamingMember(null)
      setNewMemberName('')
      showToast('Member renamed')
    } else {
      showToast(data.error || 'Failed to rename member', 'error')
    }
    setSaving(null)
  }

  // ── Remove member ──────────────────────────────────────────────────────────
  const handleRemoveMember = async (userId) => {
    setSaving(`remove-${userId}`)
    const { ok, data } = await api('/api/league-admin/remove-member', {
      leagueId: league.id, userId
    })
    if (ok) {
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      setConfirmRemove(null)
      showToast('Member removed from league')
    } else {
      showToast(data.error || 'Failed to remove member', 'error')
    }
    setSaving(null)
  }

  // ── Change admin ───────────────────────────────────────────────────────────
  const handleChangeAdmin = async (userId) => {
    setSaving(`admin-${userId}`)
    const { ok, data } = await api('/api/league-admin/change-admin', {
      leagueId: league.id, userId
    })
    if (ok) {
      showToast('Admin transferred — redirecting…')
      setTimeout(() => {
        window.location.href = `/dashboard/league/${league.id}`
      }, 1500)
    } else {
      showToast(data.error || 'Failed to change admin', 'error')
      setSaving(null)
    }
  }

  const noticeLines = notice.split('\n').length
  const noticeChanged = notice.trim() !== (league.notice || '').trim()

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href={`/dashboard/league/${league.id}`} className="text-gray-400 hover:text-white text-sm">
          ← {league.league_name}
        </Link>
        <span className="text-gray-600">/</span>
        <span className="font-bold text-yellow-400">League Admin</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Rename league — UNCHANGED */}
        <Section title="✏️ League Name">
          <div className="flex gap-3">
            <input
              type="text"
              value={leagueName}
              onChange={e => setLeagueName(e.target.value)}
              maxLength={60}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleRenameLeague}
              disabled={saving === 'league-name' || !leagueName.trim() || leagueName.trim() === league.league_name}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-lg text-sm transition-colors"
            >
              {saving === 'league-name' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>

        {/* ── NEW: League logo ── */}
        <Section title="🖼️ League Logo">
          <p className="text-gray-500 text-sm mb-4">
            Shown on the league page, dashboard, and standings. JPEG, PNG, WebP or GIF · max 500 KB.
          </p>
          <LogoUpload leagueId={league.id} initialLogoUrl={league.logo_url || null} />
        </Section>

        {/* Pinned notice — UNCHANGED */}
        <Section title="📌 Pinned Notice">
          <p className="text-gray-500 text-sm mb-3">
            Shown to all members at the top of the league page. Great for prizes, events, or links.
          </p>
          <textarea
            value={notice}
            onChange={e => {
              const lines = e.target.value.split('\n')
              if (lines.length <= 10) setNotice(e.target.value)
            }}
            maxLength={1000}
            rows={5}
            placeholder={"e.g. 🏆 Winner gets a £50 bar tab! Final standings announced Sunday.\n\nCheck our menu: https://example.com/menu"}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500 resize-none font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{noticeLines}/10 lines · {notice.length}/1000 chars</span>
            <div className="flex gap-2">
              {notice.trim() && (
                <button
                  onClick={() => setNotice('')}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSaveNotice}
                disabled={saving === 'notice' || !noticeChanged}
                className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-lg text-sm transition-colors"
              >
                {saving === 'notice' ? 'Saving…' : 'Save Notice'}
              </button>
            </div>
          </div>
        </Section>

        {/* Members — UNCHANGED */}
        <Section title="👥 Members">
          <div className="space-y-0">
            {members.map(m => {
              const isCurrentUser = m.user_id === currentUserId
              const isLeagueAdmin = m.user_id === league.admin_id
              const isRenaming = renamingMember === m.user_id
              const isConfirmRemove = confirmRemove === m.user_id
              const isConfirmAdmin = confirmChangeAdmin === m.user_id

              return (
                <div key={m.user_id} className="py-3 border-b border-gray-800/60 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                        {m.profiles?.display_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {m.profiles?.display_name}
                          {isLeagueAdmin && <span className="ml-2 text-xs text-yellow-400">⭐ Admin</span>}
                          {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{m.profiles?.email}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isCurrentUser && !isConfirmRemove && !isConfirmAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setRenamingMember(isRenaming ? null : m.user_id)
                            setNewMemberName(isRenaming ? '' : m.profiles?.display_name || '')
                          }}
                          className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors"
                        >
                          Rename
                        </button>
                        {!isLeagueAdmin && (
                          <>
                            <button
                              onClick={() => setConfirmChangeAdmin(m.user_id)}
                              className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 rounded-lg border border-gray-700 hover:border-yellow-500/30 transition-colors"
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => setConfirmRemove(m.user_id)}
                              className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg border border-gray-700 hover:border-red-500/30 transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Confirm remove */}
                    {isConfirmRemove && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-red-400">Remove {m.profiles?.display_name}?</span>
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          disabled={saving === `remove-${m.user_id}`}
                          className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving === `remove-${m.user_id}` ? '…' : 'Yes, remove'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Confirm change admin */}
                    {isConfirmAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-yellow-400">Make {m.profiles?.display_name} admin?</span>
                        <button
                          onClick={() => handleChangeAdmin(m.user_id)}
                          disabled={saving === `admin-${m.user_id}`}
                          className="text-xs px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving === `admin-${m.user_id}` ? '…' : 'Yes, transfer'}
                        </button>
                        <button
                          onClick={() => setConfirmChangeAdmin(null)}
                          className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline rename input */}
                  {isRenaming && (
                    <div className="flex gap-2 mt-2 ml-9">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        maxLength={40}
                        placeholder="New display name"
                        autoFocus
                        className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                      />
                      <button
                        onClick={() => handleRenameMember(m.user_id)}
                        disabled={saving === `rename-${m.user_id}` || !newMemberName.trim()}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-lg text-sm transition-colors"
                      >
                        {saving === `rename-${m.user_id}` ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setRenamingMember(null); setNewMemberName('') }}
                        className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* Danger zone — UNCHANGED */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-red-400 mb-1">⚠️ Danger Zone</h2>
          <p className="text-gray-500 text-sm mb-4">
            Transferring admin rights will remove your access to this page.
          </p>
          <p className="text-gray-600 text-xs">
            To transfer admin, use the &quot;Make Admin&quot; button next to a member above.
          </p>
        </div>

      </div>

      {/* Toast — UNCHANGED */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}
    </main>
  )
}