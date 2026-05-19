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
  // timingSafeEqual prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(digest, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

export async function POST(request) {
  // Read raw body for signature verification — must happen before any .json() call
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  // Verify the webhook came from Lemon Squeezy
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

  // We only care about order_created — acknowledge everything else silently
  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true })
  }

  const orderStatus  = payload.data?.attributes?.status
  const orderId      = String(payload.data?.id ?? '')
  const customData   = payload.meta?.custom_data

  // Only activate on paid orders (not pending/failed)
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

  // Update the league — use admin client to bypass RLS
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('leagues')
    .update({
      tier: newTier,
      lemon_order_id: orderId,
    })
    .eq('id', customData.league_id)

  if (error) {
    console.error('LS webhook: DB update failed', error)
    // Return 500 so LS retries the webhook
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }

  console.log(`✓ League ${customData.league_id} upgraded to ${newTier} (LS order ${orderId})`)
  return NextResponse.json({ received: true })
}