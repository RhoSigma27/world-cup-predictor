export default function BannedPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-4">Account Suspended</h1>
        <p className="text-gray-400 leading-relaxed mb-6">
          It looks like your profile may have been removed as it may have broken some of our community guidelines.
          If you think this is an error, please don&apos;t hesitate to get in touch — we&apos;re happy to look into it.
        </p>
        <a href="mailto:support@thematchpredictor.com" className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl transition-colors">
          Contact Support
        </a>
        <p className="text-gray-600 text-sm mt-4">support@thematchpredictor.com</p>
      </div>
    </main>
  )
}