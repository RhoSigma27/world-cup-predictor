'use client'
// app/mini/league/[id]/admin/MiniLeagueAdminClient.js

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const TIER_LIMITS = {
  hobby:      6,
  enthusiast: 11,
  fanatic:    Infinity,
  business:   Infinity,
}

const TIER_LABELS = {
  hobby:      'Hobby',
  enthusiast: 'Enthusiast',
  fanatic:    'Fanatic',
  business:   'Business',
}

const TIER_BADGE = {
  hobby:      'text-gray-400 bg-gray-800 border-gray-600',
  enthusiast: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  fanatic:    'text-purple-400 bg-purple-500/10 border-purple-500/30',
  business:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
}

const UPGRADE_OPTIONS = {
  hobby: [
    { targetTier: 'enthusiast', label: 'Enthusiast', price: '£12', description: 'Up to 11 members' },
    { targetTier: 'fanatic',    label: 'Fanatic',    price: '£20', description: 'Unlimited members' },
  ],
  enthusiast: [
    { targetTier: 'upgrade', label: 'Fanatic', price: '£10', description: 'Unlimited members' },
  ],
}

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ── Logo uploader ─────────────────────────────────────────────────────────────
function LogoUpload({ leagueId, initialLogoUrl }) {
  const [preview, setPreview] = useState(initialLogoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null); setSuccessMsg(null)
    if (file.size > 512000) { setError('File too large — maximum 500 KB'); return }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setError('Use JPEG, PNG, WebP or GIF'); return }
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('leagueId', leagueId)
      fd.append('file', file)
      const res = await fetch('/api/mini/league-admin/upload-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Upload failed'); setPreview(initialLogoUrl || null) }
      else { setSuccessMsg('Logo updated ✓'); setTimeout(() => setSuccessMsg(null), 3000) }
    } catch { setError('Upload failed — please try again'); setPreview(initialLogoUrl || null) }
    finally { setUploading(false) }
  }

  const handleRemove = async () => {
    setRemoving(true); setError(null)
    try {
      const res = await fetch('/api/mini/league-admin/remove-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Failed to remove logo')
      else { setPreview(null); setSuccessMsg('Logo removed ✓'); setTimeout(() => setSuccessMsg(null), 3000) }
    } catch { setError('Failed to remove logo') }
    finally { setRemoving(false) }
  }

  const handleDrop = e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  return (
    <div className="flex items-start gap-5">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {preview ? (
          <img src={preview} alt="League logo" className="w-20 h-20 rounded-full object-cover border-2 border-gray-700" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center text-2xl text-gray-600">
            🥊
          </div>
        )}
        {preview && (
          <button onClick={handleRemove} disabled={removing}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50">
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      <div className="flex-1">
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-yellow-500/50 rounded-xl p-4 cursor-pointer transition-colors text-center group">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Uploading…</span>
            </div>
          ) : (
            <>
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📁</div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-600 mt-0.5">JPEG, PNG, WebP, GIF · max 500 KB</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {successMsg && <p className="text-green-400 text-xs mt-2">{successMsg}</p>}
      </div>
    </div>
  )
}

// ── QR Card Modal (Business tier) ─────────────────────────────────────────────
function QRCardModal({ league, onClose }) {
  const canvasRef = useRef(null)
  const [generating, setGenerating] = useState(true)
  const [qrError, setQrError] = useState(null)
  const joinUrl = `https://thematchpredictor.com/mini/join/${league.invite_code}`

  useEffect(() => {
    let cancelled = false
    const generate = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const W = 794, H = 1123
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
        bgGrad.addColorStop(0, '#0a0a0f'); bgGrad.addColorStop(1, '#111827')
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(0, 0, W, 8); ctx.fillRect(0, H - 8, W, 8)
        ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('🥊 World Cup Knockout Predictor 2026', W / 2, 70)
        ctx.fillStyle = '#9ca3af'; ctx.font = '18px sans-serif'
        ctx.fillText('Pick the winner of every knockout match.', W / 2, 105)
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(60, 125); ctx.lineTo(W - 60, 125); ctx.stroke()
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px sans-serif'
        ctx.fillText(league.league_name, W / 2, 200)
        const qrSize = 300, qrX = (W - qrSize) / 2, qrY = 230, pad = 16
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 16); ctx.fill()
        const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: qrSize, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        const qrImg = new window.Image()
        await new Promise(res => { qrImg.onload = res; qrImg.src = qrDataUrl })
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
        const msgY = qrY + qrSize + pad + 50
        ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 26px sans-serif'
        ctx.fillText('Scan to join our league', W / 2, msgY)
        ctx.fillStyle = '#d1d5db'; ctx.font = '20px sans-serif'
        ctx.fillText('and predict the knockout winners!', W / 2, msgY + 34)
        ctx.fillStyle = '#6b7280'; ctx.font = '16px sans-serif'
        ctx.fillText(`Invite code: ${league.invite_code}`, W / 2, msgY + 70)
        ctx.fillStyle = '#4b5563'; ctx.font = '14px sans-serif'
        ctx.fillText('thematchpredictor.com/mini', W / 2, H - 25)
        if (!cancelled) setGenerating(false)
      } catch (err) {
        console.error(err)
        if (!cancelled) setQrError('Failed to generate card')
      }
    }
    generate()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const canvas = canvasRef.current
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
      pdf.addImage(imgData, 'PNG', 0, 0, 148, 210)
      pdf.save(`${league.league_name.replace(/\s+/g, '-')}-qr-card.pdf`)
    } catch (err) { console.error(err) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-white">📋 QR Table Card</h2>
            <p className="text-xs text-gray-500 mt-0.5">{league.league_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl px-2">✕</button>
        </div>
        <div className="relative bg-gray-800 rounded-xl overflow-hidden mb-4" style={{ minHeight: 200 }}>
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Generating card…</span>
              </div>
            </div>
          )}
          {qrError && <div className="absolute inset-0 flex items-center justify-center"><span className="text-red-400 text-sm">{qrError}</span></div>}
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: generating ? 'none' : 'block' }} />
        </div>
        {!generating && !qrError && (
          <div className="flex gap-3">
            <button onClick={handleDownloadPDF} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-sm transition-colors">
              ⬇ Download PDF (A5)
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm transition-colors">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MiniLeagueAdminClient({ league: initialLeague, members: initialMembers, currentUserId }) {
  const [league, setLeague] = useState(initialLeague)
  const [members, setMembers] = useState(initialMembers)
  const [toast, setToast] = useState(null)
  const [upgrading, setUpgrading] = useState(null)
  const [leagueName, setLeagueName] = useState(initialLeague.league_name)
  const [notice, setNotice] = useState(initialLeague.notice || '')
  const [renamingMember, setRenamingMember] = useState(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [confirmChangeAdmin, setConfirmChangeAdmin] = useState(null)
  const [saving, setSaving] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)

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

  // ── Upgrade ───────────────────────────────────────────────────────────────
  const handleUpgrade = async (targetTier) => {
    setUpgrading(targetTier)
    try {
      const res = await fetch('/api/mini/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_id: league.id, target_tier: targetTier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { showToast(data.error || 'Failed to create checkout', 'error'); setUpgrading(null) }
    } catch { showToast('Something went wrong', 'error'); setUpgrading(null) }
  }

  // ── Rename league ─────────────────────────────────────────────────────────
  const handleRenameLeague = async () => {
    if (!leagueName.trim() || leagueName.trim() === league.league_name) return
    setSaving('league-name')
    const { ok, data } = await api('/api/mini/league-admin/rename-league', {
      leagueId: league.id, name: leagueName.trim(),
    })
    if (ok) { setLeague(prev => ({ ...prev, league_name: leagueName.trim() })); showToast('League renamed') }
    else showToast(data.error || 'Failed to rename league', 'error')
    setSaving(null)
  }

  // ── Save notice ───────────────────────────────────────────────────────────
  const handleSaveNotice = async () => {
    setSaving('notice')
    const { ok, data } = await api('/api/mini/league-admin/set-notice', {
      leagueId: league.id, notice: notice.trim(),
    })
    if (ok) { setLeague(prev => ({ ...prev, notice: notice.trim() })); showToast('Notice saved') }
    else showToast(data.error || 'Failed to save notice', 'error')
    setSaving(null)
  }

  // ── Rename member ─────────────────────────────────────────────────────────
  const handleRenameMember = async (userId) => {
    if (!newMemberName.trim()) return
    setSaving(`rename-${userId}`)
    const { ok, data } = await api('/api/mini/league-admin/rename-member', {
      leagueId: league.id, userId, name: newMemberName.trim(),
    })
    if (ok) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, nickname: newMemberName.trim() } : m))
      setRenamingMember(null); setNewMemberName('')
      showToast('Member renamed')
    } else showToast(data.error || 'Failed to rename member', 'error')
    setSaving(null)
  }

  // ── Remove member ─────────────────────────────────────────────────────────
  const handleRemoveMember = async (userId) => {
    setSaving(`remove-${userId}`)
    const { ok, data } = await api('/api/mini/league-admin/remove-member', {
      leagueId: league.id, userId,
    })
    if (ok) {
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      setConfirmRemove(null)
      showToast('Member removed')
    } else showToast(data.error || 'Failed to remove member', 'error')
    setSaving(null)
  }

  // ── Change admin ──────────────────────────────────────────────────────────
  const handleChangeAdmin = async (userId) => {
    setSaving(`admin-${userId}`)
    const { ok, data } = await api('/api/mini/league-admin/change-admin', {
      leagueId: league.id, userId,
    })
    if (ok) {
      showToast('Admin transferred — redirecting…')
      setTimeout(() => { window.location.href = `/mini/league/${league.id}` }, 1500)
    } else {
      showToast(data.error || 'Failed to change admin', 'error')
      setSaving(null)
    }
  }

  const tier = league.tier ?? 'hobby'
  const isComped = league.is_comped === true
  const isBusiness = tier === 'business' || isComped
  const limit = isComped ? Infinity : (TIER_LIMITS[tier] ?? 6)
  const upgradeOptions = UPGRADE_OPTIONS[tier] ?? []
  const isMaxTier = upgradeOptions.length === 0
  const tierLabel = TIER_LABELS[tier] ?? 'Hobby'
  const badgeCls = isComped ? 'text-green-400 bg-green-500/10 border-green-500/30' : (TIER_BADGE[tier] ?? TIER_BADGE.hobby)
  const noticeLines = notice.split('\n').length
  const noticeChanged = notice.trim() !== (league.notice || '').trim()

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href={`/mini/league/${league.id}`} className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {league.league_name}
        </Link>
        <span className="text-gray-600">/</span>
        <span className="font-bold text-yellow-400">League Admin</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Plan / Upgrade */}
        <Section title="💳 League Plan">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badgeCls}`}>
              {isComped ? '⭐ Comped' : tierLabel}
            </span>
            <span className="text-sm text-gray-400">
              {members.length} member{members.length !== 1 ? 's' : ''} · {isComped ? 'Comped' : tierLabel} tier
              {isFinite(limit) ? ` (max ${limit})` : ' (unlimited)'}
              {isFinite(limit) && members.length >= limit && (
                <span className="ml-2 text-red-400 font-medium">· limit reached</span>
              )}
            </span>
          </div>
          {!isComped && !isMaxTier && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Upgrade to unlock more members:</p>
              {upgradeOptions.map(opt => (
                <button
                  key={opt.targetTier}
                  onClick={() => handleUpgrade(opt.targetTier)}
                  disabled={!!upgrading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-yellow-500/10 border border-gray-700 hover:border-yellow-500/30 rounded-xl transition-colors disabled:opacity-50 group"
                >
                  <div className="text-left">
                    <span className="font-medium text-white text-sm">{opt.label}</span>
                    <span className="text-gray-500 text-xs ml-2">— {opt.description}</span>
                  </div>
                  <span className="text-yellow-400 font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                    {upgrading === opt.targetTier ? 'Redirecting…' : `${opt.price} →`}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!isComped && isMaxTier && (
            <p className="text-sm text-gray-500">
              ✓ You're on the <span className="text-white font-medium">{tierLabel}</span> plan — unlimited members.
            </p>
          )}
          {isComped && (
            <p className="text-sm text-gray-500">✓ This league has been comped — unlimited members, no charge.</p>
          )}
        </Section>

        {/* Rename */}
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

        {/* Logo */}
        <Section title="🖼️ League Logo">
          <p className="text-gray-500 text-sm mb-4">
            Shown on the league page and dashboard. JPEG, PNG, WebP or GIF · max 500 KB.
          </p>
          <LogoUpload leagueId={league.id} initialLogoUrl={league.logo_url || null} />
        </Section>

        {/* QR card — business tier */}
        {isBusiness && (
          <Section title="📋 QR Table Card">
            <p className="text-gray-500 text-sm mb-4">
              Generate a print-ready A5 PDF with your league's QR code. Put one on every table so members can join instantly by scanning.
            </p>
            <button
              onClick={() => setShowQrModal(true)}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl text-sm transition-colors border border-yellow-500/20"
            >
              📋 Generate QR Table Card
            </button>
          </Section>
        )}

        {/* Notice */}
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
            placeholder={"e.g. 🏆 Winner gets a £50 bar tab!\n\nCheck our menu: https://example.com/menu"}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500 resize-none font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{noticeLines}/10 lines · {notice.length}/1000 chars</span>
            <div className="flex gap-2">
              {notice.trim() && (
                <button onClick={() => setNotice('')}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors">
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

        {/* Members */}
        <Section title="👥 Members">
          <div className="space-y-0">
            {members.map(m => {
              const isCurrentUser  = m.user_id === currentUserId
              const isLeagueAdmin  = m.user_id === league.admin_id
              const isRenaming     = renamingMember === m.user_id
              const isConfirmRemove = confirmRemove === m.user_id
              const isConfirmAdmin  = confirmChangeAdmin === m.user_id
              const effectiveName  = m.nickname || m.profiles?.display_name

              return (
                <div key={m.user_id} className="py-3 border-b border-gray-800/60 last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                        {effectiveName?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {effectiveName}
                          {isLeagueAdmin && <span className="ml-2 text-xs text-yellow-400">⭐ Admin</span>}
                          {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                        </p>
                        {m.nickname && (
                          <p className="text-xs text-gray-600 truncate">{m.profiles?.display_name}</p>
                        )}
                      </div>
                    </div>

                    {!isCurrentUser && !isConfirmRemove && !isConfirmAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-9 sm:ml-0">
                        <button
                          onClick={() => {
                            setRenamingMember(isRenaming ? null : m.user_id)
                            setNewMemberName(isRenaming ? '' : (m.nickname || m.profiles?.display_name || ''))
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

                    {isConfirmRemove && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-9 sm:ml-0">
                        <span className="text-xs text-red-400">Remove {effectiveName}?</span>
                        <button onClick={() => handleRemoveMember(m.user_id)}
                          disabled={saving === `remove-${m.user_id}`}
                          className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50">
                          {saving === `remove-${m.user_id}` ? '…' : 'Yes, remove'}
                        </button>
                        <button onClick={() => setConfirmRemove(null)}
                          className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}

                    {isConfirmAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-9 sm:ml-0">
                        <span className="text-xs text-yellow-400">Make {effectiveName} admin?</span>
                        <button onClick={() => handleChangeAdmin(m.user_id)}
                          disabled={saving === `admin-${m.user_id}`}
                          className="text-xs px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg transition-colors disabled:opacity-50">
                          {saving === `admin-${m.user_id}` ? '…' : 'Yes, transfer'}
                        </button>
                        <button onClick={() => setConfirmChangeAdmin(null)}
                          className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {isRenaming && (
                    <div className="flex gap-2 mt-2 ml-9">
                      <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                        maxLength={40} placeholder="Nickname for this league" autoFocus
                        className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500" />
                      <button onClick={() => handleRenameMember(m.user_id)}
                        disabled={saving === `rename-${m.user_id}` || !newMemberName.trim()}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-lg text-sm transition-colors">
                        {saving === `rename-${m.user_id}` ? '…' : 'Save'}
                      </button>
                      <button onClick={() => { setRenamingMember(null); setNewMemberName('') }}
                        className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-red-400 mb-1">⚠️ Danger Zone</h2>
          <p className="text-gray-500 text-sm mb-2">
            Transferring admin rights will remove your access to this page.
          </p>
          <p className="text-gray-600 text-xs">
            To transfer admin, use the "Make Admin" button next to a member above.
          </p>
        </div>

      </div>

      {showQrModal && <QRCardModal league={league} onClose={() => setShowQrModal(false)} />}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50 ${
          toast.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          {toast.msg}
        </div>
      )}
    </main>
  )
}