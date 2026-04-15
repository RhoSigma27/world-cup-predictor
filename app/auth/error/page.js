import Link from 'next/link'

export const viewport = {
  themeColor: '#e8c96b',
}

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
        <p className="text-gray-400 mb-6">
          Your sign-in link has expired or is invalid. Magic links are only valid for 1 hour.
        </p>
        <Link
          href="/auth/signin"
          className="block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl transition-colors"
        >
          Request a New Link
        </Link>
      </div>
    </main>
  )
}