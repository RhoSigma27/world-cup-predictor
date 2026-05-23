'use client'

// app/dashboard/league/[id]/standings/StandingsShareButton.js
import { useState } from 'react'

export default function StandingsShareButton({ ogImageUrl, pageUrl, leagueName }) {
  const [showPreview, setShowPreview] = useState(false)
  const [copyStatus, setCopyStatus] = useState('idle')

  const handleShare = async () => {
    try {
      if (ogImageUrl && navigator.canShare) {
        const res = await fetch(ogImageUrl)
        const blob = await res.blob()
        const file = new File([blob], 'standings.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${leagueName} — Standings`, text: `Check out the ${leagueName} leaderboard!` })
          setShowPreview(false)
          return
        }
      }
      if (navigator.share) {
        await navigator.share({ title: `${leagueName} — Standings`, text: `Check out the ${leagueName} World Cup 2026 leaderboard!`, url: pageUrl })
        setShowPreview(false)
        return
      }
      await navigator.clipboard.writeText(pageUrl)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (e) {
      if (e?.name !== 'AbortError') {
        try { await navigator.clipboard.writeText(pageUrl); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000) } catch {}
      }
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border-gray-700"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share standings
      </button>

      {showPreview && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-white">{leagueName} — Standings</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-white text-lg px-1">✕</button>
            </div>
            {ogImageUrl && (
              <div className="p-4 bg-gray-950">
                <img src={ogImageUrl} alt="Standings card preview" className="w-full rounded-lg border border-gray-800" style={{ aspectRatio: '1200/630', objectFit: 'cover' }} />
              </div>
            )}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-800">
              <button onClick={handleShare} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-sm transition-colors">
                Share →
              </button>
              <button onClick={handleCopyLink} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${copyStatus === 'copied' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'}`}>
                {copyStatus === 'copied' ? '✓ Copied!' : 'Copy link'}
              </button>
              {ogImageUrl && (
                <a href={ogImageUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 font-bold rounded-xl text-sm transition-colors border border-gray-700">
                  Open full size
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}