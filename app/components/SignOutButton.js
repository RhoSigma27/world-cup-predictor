'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}