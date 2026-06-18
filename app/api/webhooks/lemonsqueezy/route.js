// app/api/webhooks/lemonsqueezy/route.js
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Maps target_tier from checkout custom_data → the tier value stored in the DB
const TIER_RESULT_MAP = {
  enthusiast: 'enthusiast', // hobby → enthusiast
  fanatic:    'fanatic',    // hobby → fanatic (direct)
  upgrade:    'fanatic',    // enthusiast → fanatic (upgrade)
  business:   'business',   // any → business
}

function verifyWebhookSignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(rawBody).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(digest, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  try {
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    )
    if (!isValid) {
      console.error('LS webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch (err) {
    console.error('LS webhook: signature verification error', err)
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventName = payload.meta?.event_name

  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true })
  }

  const orderStatus = payload.data?.attributes?.status
  const orderId     = String(payload.data?.id ?? '')
  const customData  = payload.meta?.custom_data

  if (orderStatus !== 'paid') {
    return NextResponse.json({ received: true })
  }

  if (!customData?.league_id || !customData?.target_tier) {
    console.error('LS webhook: missing custom_data fields', customData)
    return NextResponse.json({ error: 'Missing custom data' }, { status: 400 })
  }

  const newTier = TIER_RESULT_MAP[customData.target_tier]
  if (!newTier) {
    console.error('LS webhook: unknown target_tier', customData.target_tier)
    return NextResponse.json({ error: 'Unknown tier' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Route to the correct table based on league_type in custom_data.
  // Mini-game business leagues set league_type: 'mini' at checkout creation.
  // All existing main-game checkouts have no league_type field, so they
  // fall through to the original leagues table as before.
  const isMini = customData.league_type === 'mini'
  const table  = isMini ? 'mini_leagues' : 'leagues'

  const { error } = await adminSupabase
    .from(table)
    .update({
      tier: newTier,
      lemon_order_id: orderId,
    })
    .eq('id', customData.league_id)

  if (error) {
    console.error(`LS webhook: DB update failed on ${table}`, error)
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }

  console.log(`✓ ${table} ${customData.league_id} upgraded to ${newTier} (LS order ${orderId})`)
  return NextResponse.json({ received: true })
}