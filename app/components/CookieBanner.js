'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const acknowledged = localStorage.getItem('cookie_acknowledged')
    if (!acknowledged) setVisible(true)
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('cookie_acknowledged', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 px-6 py-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-400">
          This site uses essential cookies to keep you signed in. No tracking or advertising cookies are used. See our{' '}
          <Link href="/privacy" className="text-yellow-400 hover:text-yellow-300 underline">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <button
          onClick={handleAcknowledge}
          className="flex-shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 text-sm font-bold rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}