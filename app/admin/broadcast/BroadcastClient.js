'use client'

import { useState, useEffect } from 'react'

const TIER_OPTIONS = [
  { value: 'all',        label: 'All league admins' },
  { value: 'hobby',      label: 'Hobby tier only' },
  { value: 'enthusiast', label: 'Enthusiast tier only' },
  { value: 'fanatic',    label: 'Fanatic tier only' },
  { value: 'business',   label: 'Business tier only' },
]

export default function BroadcastClient() {
  const [tier, setTier]           = useState('all')
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [count, setCount]         = useState(null)
  const [countLoading, setCountLoading] = useState(false)
  const [confirming, setConfirming]     = useState(false)
  const [sending, setSending]           = useState(false)
  const [result, setResult]             = useState(null) // { success, recipientCount } or { error }

  // Fetch recipient count whenever tier changes
  useEffect(() => {
    setCountLoading(true)
    fetch(`/api/admin/broadcast?tier=${tier}`)
      .then(r => r.json())
      .then(d => setCount(d.count ?? null))
      .catch(() => setCount(null))
      .finally(() => setCountLoading(false))
  }, [tier])

  function handlePreview(e) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setConfirming(true)
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, tier }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ error: data.error || 'Something went wrong' })
      } else {
        setResult({ success: true, recipientCount: data.recipientCount })
        setSubject('')
        setMessage('')
        setConfirming(false)
      }
    } catch {
      setResult({ error: 'Network error — please try again' })
    } finally {
      setSending(false)
    }
  }

  if (result?.success) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Broadcast sent</h2>
        <p className="text-gray-400">
          Your message was sent to <span className="text-yellow-400 font-bold">{result.recipientCount}</span> league admin{result.recipientCount !== 1 ? 's' : ''}.
        </p>
        <button
          onClick={() => setResult(null)}
          className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
        >
          Send another
        </button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="bg-gray-900 border border-yellow-500/40 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-400">Confirm before sending</h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500 uppercase tracking-wider text-xs mb-1">Recipients</p>
            <p className="text-white font-semibold">
              {TIER_OPTIONS.find(t => t.value === tier)?.label}
              {count !== null && <span className="text-yellow-400 ml-2">— {count} admin{count !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wider text-xs mb-1">Subject</p>
            <p className="text-white">{subject}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wider text-xs mb-1">Message</p>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{message}</p>
          </div>
        </div>

        {result?.error && (
          <p className="text-red-400 text-sm">{result.error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold rounded-lg text-sm transition-colors"
          >
            {sending ? 'Sending…' : `Send to ${count ?? '?'} admin${count !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => { setConfirming(false); setResult(null) }}
            disabled={sending}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handlePreview} className="space-y-5">

      {/* Tier filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Send to</label>
        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
        >
          {TIER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-gray-500 text-xs mt-1.5">
          {countLoading
            ? 'Counting recipients…'
            : count !== null
              ? `${count} unique league admin${count !== 1 ? 's' : ''} will receive this email`
              : 'Unable to fetch count'}
        </p>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          required
          placeholder="e.g. Tournament update from The Match Predictor"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder-gray-600"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={7}
          placeholder="Write your message here…"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder-gray-600 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!subject.trim() || !message.trim() || countLoading}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 font-bold rounded-xl text-sm transition-colors"
      >
        Preview & confirm →
      </button>

    </form>
  )
}