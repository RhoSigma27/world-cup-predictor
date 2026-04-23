'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function HelpButton() {
  const pathname = usePathname()

  // Don't show on the help page itself
  if (pathname === '/help') return null

  return (
    <Link
      href="/help"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-yellow-500/20 transition-all hover:scale-110 active:scale-95"
      title="Help & FAQs"
      aria-label="Help and FAQs"
    >
      ?
    </Link>
  )
}