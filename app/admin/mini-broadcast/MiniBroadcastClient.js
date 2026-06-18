'use client'
// app/admin/mini-broadcast/MiniBroadcastClient.js

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TIERS = [
  { value: 'all',        label: 'All mini-game admins' },
  { value: 'hobby',      label: 'Hobby only' },
  { value: 'enthusiast', label: 'Enthusiast only' },
  { value: 'fanatic',    label: 'Fanatic only' },
  { value: 'business',   label: 'Business only' },
]

const QUICK_MESSAGES = [
  {
    label: '⏰ Predictions reminder',
    subject: '⏰ Get your predictions in — knockout stage starts June 28',
    message: `The knockout draw is almost here!\n\nRemind your league members to get their predictions in before June 28. Semi-finalist picks lock at half-time of the first Round of 32 match.\n\nHead to your league dashboard to check who's made their picks — and give any stragglers a nudge.`,
  },
  {
    label: '🥊 Bracket open',
    subject: '🥊 The knockout bracket is now open — make your predictions',
    message: `The Round of 32 draw is set and the knockout bracket is now open!\n\nLog in and predict the winner of every knockout match — from the Round of 32 all the way to the Final.\n\nGood luck!`,
  },
]

export default function MiniBroadcastClient() {
  const [tier, setTier] = useState('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recipientCount, setRecipientCount] = useState(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      setLoadingCount(true)
      setRecipientCount(null)
      try {
        const res = await fetch(`/api/admin/mini-broadcast?tier=${tier}`)
        const data = await res.json()
        if (!cancelled) setRecipientCount(data.count ?? 0)
      } catch { if (!cancelled) setRecipientCount(0) }
      finally { if (!cancelled) setLoadingCount(false) }
    }
    fetchCount()
    return () => { cancelled = true }
  }, [tier])

  const handleQuickMessage = (qm) => {
    setSubject(qm.subject)
    setMessage(qm.message)
    setConfirmed(false)
    setResult(null)
  }

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/mini-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, tier }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send'); setSending(false); return }
      setResult(data)
      setSubject('')
      setMessage('')
      setConfirmed(false)
    } catch { setError('Something went wrong') }
    finally { setSending(false) }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
        <span className="text-gray-600">/</span>
        <span className="font-bold text-yellow-400">Mini-Game Broadcast</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">📣 Broadcast to Mini-Game Admins</h1>
          <p className="text-gray-400 text-sm">
            Send an email to admins of mini-game leagues. One email per admin regardless of how many leagues they run.
          </p>
        </div>

        {result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6">
            <p className="text-green-400 font-bold">✓ Email sent to {result.sent} admin{result.sent !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Quick message templates */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Quick messages</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map(qm => (
              <button
                key={qm.label}
                onClick={() => handleQuickMessage(qm)}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-yellow-500/10 text-gray-400 hover:text-yellow-400 border border-gray-700 hover:border-yellow-500/30 rounded-lg transition-colors"
              >
                {qm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier filter */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <label className="block text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">
            Send to
          </label>
          <select
            value={tier}
            onChange={e => { setTier(e.target.value); setConfirmed(false) }}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
          >
            {TIERS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            {loadingCount
              ? 'Counting recipients…'
              : recipientCount != null
                ? `${recipientCount} unique admin email${recipientCount !== 1 ? 's' : ''} will receive this`
                : ''
            }
          </p>
        </div>

        {/* Compose */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => { setSubject(e.target.value); setConfirmed(false) }}
              maxLength={100}
              placeholder="e.g. ⏰ Get your predictions in before June 28"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Message</label>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setConfirmed(false) }}
              maxLength={2000}
              rows={8}
              placeholder="Your message to mini-game league admins…"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500 resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">{message.length}/2000 chars</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Send flow */}
        {!confirmed ? (
          <button
            onClick={() => setConfirmed(true)}
            disabled={!subject.trim() || !message.trim() || recipientCount === 0}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-xl transition-colors"
          >
            Review & Send
          </button>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5">
            <p className="text-yellow-300 font-bold mb-1">
              Send to {recipientCount} admin{recipientCount !== 1 ? 's' : ''}?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Subject: <span className="text-white">{subject}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold rounded-xl text-sm transition-colors"
              >
                {sending ? 'Sending…' : 'Yes, send now'}
              </button>
              <button
                onClick={() => setConfirmed(false)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}