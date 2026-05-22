'use client'

// app/dashboard/league/[id]/standings/StandingsShareButton.js
// Share button that fetches the OG image and shares it as a file on mobile,
// or copies the standings URL to clipboard on desktop.

import { useState } from 'react'

export default function StandingsShareButton({ ogImageUrl, pageUrl, leagueName }) {
  const [status, setStatus] = useState('idle')

  const handleShare = async () => {
    setStatus('sharing')
    try {
      // Try sharing the OG image as a file (works great on mobile — shows image in share sheet)
      if (navigator.canShare) {
        try {
          const res = await fetch(ogImageUrl)
          const blob = await res.blob()
          const file = new File([blob], 'standings.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${leagueName} — Standings`,
              text: `Check out the ${leagueName} World Cup 2026 leaderboard!`,
            })
            setStatus('idle')
            return
          }
        } catch {
          // Fall through
        }
      }

      // Web Share API with URL (unfurls OG image in WhatsApp/iMessage)
      if (navigator.share) {
        await navigator.share({
          title: `${leagueName} — Standings`,
          text: `Check out the ${leagueName} World Cup 2026 leaderboard!`,
          url: pageUrl,
        })
        setStatus('idle')
        return
      }

      // Clipboard fallback
      await navigator.clipboard.writeText(pageUrl)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('idle')
      else setStatus('idle')
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={status === 'sharing'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border
        ${status === 'copied'
          ? 'bg-green-500/10 text-green-400 border-green-500/30'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border-gray-700'
        } disabled:opacity-50`}
    >
      {status === 'idle' && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share standings
        </>
      )}
      {status === 'sharing' && '…'}
      {status === 'copied'  && '✓ Copied!'}
    </button>
  )
}