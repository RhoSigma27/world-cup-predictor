// app/api/og/bracket/route.js
// Test 2: add bracketEngine import
import { ImageResponse } from 'next/og'
import { calcGroupTables, buildAnnexMap, resolveSlot, normalisePred } from '@/lib/bracketEngine'

export const runtime = 'edge'

export async function GET(request) {
  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', background: '#060e1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '40px', color: '#ca8a04', fontWeight: 800 }}>
          bracketEngine imported OK
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}