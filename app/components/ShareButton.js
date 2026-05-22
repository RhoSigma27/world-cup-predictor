'use client'

// app/components/ShareButton.js
// Generic share button. Uses Web Share API on mobile, falls back to clipboard copy.
// For bracket shares, fetches the OG image as a file blob and shares it directly.

import { useState } from 'react'

export default function ShareButton({
  url,           // URL to share (for standings / league page)
  title,         // Share title
  text,          // Share subtitle text
  imageUrl,      // If set, fetches this image and shares as a file (bracket mode)
  label = 'Share',
  className = '',
}) {
  const [status, setStatus] = useState('idle') // idle | sharing | copied | error

  const handleShare = async () => {
    setStatus('sharing')
    try {
      // Image share (bracket) — fetch the OG image and share as a file
      if (imageUrl && navigator.canShare) {
        try {
          const res = await fetch(imageUrl)
          const blob = await res.blob()
          const file = new File([blob], 'my-bracket.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title,
              text,
            })
            setStatus('idle')
            return
          }
        } catch {
          // Fall through to URL share or clipboard
        }
      }

      // URL share — standard Web Share API
      if (navigator.share) {
        await navigator.share({ title, text, url })
        setStatus('idle')
        return
      }

      // Clipboard fallback
      await navigator.clipboard.writeText(url || imageUrl || '')
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      if (err.name !== 'AbortError') {
        // User cancelled — not an error, just reset
        setStatus('idle')
      }
      setStatus('idle')
    }
  }

  const labels = {
    idle:    label,
    sharing: 'Sharing…',
    copied:  '✓ Copied!',
    error:   'Try again',
  }

  return (
    <button
      onClick={handleShare}
      disabled={status === 'sharing'}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50
        bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-600
        ${status === 'copied' ? 'text-green-400 border-green-500/30' : ''}
        ${className}`}
    >
      {status === 'idle'    && <ShareIcon />}
      {status === 'sharing' && <span className="animate-spin">⏳</span>}
      {status === 'copied'  && '✓'}
      {labels[status]}
    </button>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}