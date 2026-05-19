'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookiesAccepted')
    if (!accepted) setVisible(true)
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-300 text-center sm:text-left">
        We use essential cookies to keep you signed in and the app running.{' '}
        <Link href="/privacy#cookies" className="text-yellow-400 hover:text-yellow-300 underline">
          Learn more
        </Link>
      </p>
      <button
        onClick={handleAccept}
        className="shrink-0 px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold text-sm rounded-lg transition-colors"
      >
        Got it
      </button>
    </div>
  )
}