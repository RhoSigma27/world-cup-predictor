// app/api/og/bracket/route.js
// Ultra-minimal test — no imports except next/og
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request) {
  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '40px', color: '#ca8a04', fontWeight: 800 }}>
          Bracket route is alive
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}