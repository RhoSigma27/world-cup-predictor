// app/dashboard/join-league/page.js
import { Suspense } from 'react'
import JoinLeagueClient from './JoinLeagueClient'

export default function JoinLeaguePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <JoinLeagueClient />
    </Suspense>
  )
}