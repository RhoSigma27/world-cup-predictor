'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const invite = searchParams.get('invite')

  // ── Step 1: request OTP ───────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          display_name: displayName,
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP code ───────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'email',
    })

    if (error) {
      setError('Invalid or expired code — please check and try again.')
      setVerifying(false)
    } else {
      // Redirect to dashboard (or back to invite flow)
      const next = invite ? `/join/${invite}` : '/dashboard'
      router.push(next)
    }
  }

  // ── Step 1: email + name form ─────────────────────────────────────────────
  if (!sent) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚽</div>
            <h1 className="text-3xl font-bold text-white">World Cup Predictor</h1>
            {invite ? (
              <p className="text-yellow-400 mt-2 font-medium">
                You've been invited to join a league! Sign in to accept.
              </p>
            ) : (
              <p className="text-gray-400 mt-2">Sign in to join or create a league</p>
            )}
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Code ✨'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            No password needed — we'll email you a 6-digit code
          </p>
        </div>
      </main>
    )
  }

  // ── Step 2: OTP code entry ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm">
            We sent a 6-digit code to <strong className="text-white">{email}</strong>
          </p>
          {invite && (
            <p className="text-yellow-400 text-sm mt-2">
              You'll be automatically joined to the league after signing in.
            </p>
          )}
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter your 6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              required
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-3xl font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={verifying || otp.length < 6}
            className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Sign In →'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-sm">Code expires in 1 hour</p>
          <button
            onClick={() => { setSent(false); setOtp(''); setError(null) }}
            className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
          >
            Wrong email? Go back
          </button>
        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}