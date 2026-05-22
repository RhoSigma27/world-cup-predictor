// app/api/og/standings/route.js
// Accepts pre-encoded standings data from the standings page's generateMetadata.
// No Supabase calls needed — all data is in the URL param.
// This keeps the route fast and avoids cold start issues.

import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const d = searchParams.get('d')
  if (!d) return new Response('Missing data', { status: 400 })

  let payload
  try {
    payload = JSON.parse(atob(d))
  } catch {
    return new Response('Invalid data', { status: 400 })
  }

  const { leagueName, bannerUrl, top5 = [], count = 0 } = payload
  const hasBanner = !!bannerUrl
  const headerHeight = hasBanner ? 180 : 100

  const medalEmoji = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0f1117',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#1a1f2e',
            borderBottom: '3px solid #eab308',
            padding: '0 48px',
            height: `${headerHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {hasBanner && (
            <img
              src={bannerUrl}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '1200px', height: `${headerHeight}px`,
                objectFit: 'cover', opacity: 0.45,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '34px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{leagueName}</span>
            <span style={{ fontSize: '18px', color: '#9ca3af' }}>World Cup 2026 Predictor · Standings</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '15px', color: '#6b7280' }}>Play free at</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#eab308' }}>thematchpredictor.com</span>
          </div>
        </div>

        {/* Rows */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: `${hasBanner ? 14 : 20}px 48px`,
            gap: '10px',
          }}
        >
          {top5.map((row) => {
            const medal = medalEmoji(row.rank)
            return (
              <div
                key={row.rank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1a1f2e',
                  borderRadius: '10px',
                  padding: '0 24px',
                  height: hasBanner ? '64px' : '74px',
                  opacity: row.rank > 3 ? 0.7 : 1,
                }}
              >
                <span style={{
                  width: '52px',
                  fontSize: medal ? '28px' : '20px',
                  fontWeight: 700,
                  color: '#6b7280',
                  flexShrink: 0,
                }}>
                  {medal ?? row.rank}
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: row.rank === 1 ? '#78350f' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: row.rank === 1 ? '#fde68a' : '#d1d5db',
                    flexShrink: 0,
                    marginRight: '18px',
                  }}
                >
                  {(row.name || '?')[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '24px', fontWeight: 600, color: 'white' }}>
                  {row.name}
                </span>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#eab308' }}>{row.pts}</span>
                <span style={{ fontSize: '15px', color: '#6b7280', marginLeft: '6px' }}>pts</span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #1f2937',
            padding: '10px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '15px', color: '#6b7280' }}>
            ⚽ Join {leagueName} — play free at{' '}
            <span style={{ color: '#eab308', fontWeight: 700 }}>thematchpredictor.com</span>
          </span>
          <span style={{ fontSize: '13px', color: '#4b5563' }}>
            {count} member{count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}