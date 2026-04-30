'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const MemberBracketModal = dynamic(() => import('./MemberBracketModal'), { ssr: false })

const LOCK_DATE = new Date('2025-01-01T00:00:00Z')

export default function MembersList({ members, adminId, currentUserId, fixtures, leagueId }) {
  const [viewingMember, setViewingMember] = useState(null) // { userId, displayName }
  const locked = new Date() >= LOCK_DATE

  function handleClick(userId, displayName) {
    if (!locked) return
    if (userId === currentUserId) return
    setViewingMember({ userId, displayName })
  }

  return (
    <>
      <div className="space-y-0">
        {members?.map(({ user_id, profiles: profile }) => {
          const isCurrentUser = user_id === currentUserId
          const displayName = profile?.display_name
          const isClickable = locked && !isCurrentUser

          return (
            <div
              key={user_id}
              className={`flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0
                ${isClickable ? 'cursor-pointer hover:bg-gray-800/40 -mx-2 px-2 rounded-lg transition-colors' : ''}`}
              onClick={() => isClickable && handleClick(user_id, displayName)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                  {displayName?.[0]?.toUpperCase()}
                </div>
                <p className="font-medium text-sm">
                  {displayName}
                  {user_id === adminId && (
                    <span className="ml-2 text-xs text-yellow-400">⭐ Admin</span>
                  )}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                  )}
                </p>
              </div>
              {isClickable && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  View bracket <span className="text-gray-600">→</span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {locked && (
        <p className="text-xs text-gray-600 mt-3">
          Tap a player to view their predicted bracket
        </p>
      )}

      {viewingMember && (
        <MemberBracketModal
          member={viewingMember}
          leagueId={leagueId}
          fixtures={fixtures}
          onClose={() => setViewingMember(null)}
        />
      )}
    </>
  )
}