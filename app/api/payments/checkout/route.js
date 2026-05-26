// app/api/payments/checkout/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Which upgrades are valid from each current tier
const VALID_UPGRADES = {
  hobby:      ['enthusiast', 'fanatic', 'business'],
  enthusiast: ['upgrade', 'business'],
}

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { league_id, target_tier } = body

  if (!league_id || !target_tier) {
    return NextResponse.json({ error: 'Missing league_id or target_tier' }, { status: 400 })
  }

  // Read env vars fresh on every request (avoids module-level caching issues)
  const VARIANT_MAP = {
    enthusiast: process.env.LEMONSQUEEZY_VARIANT_ENTHUSIAST,
    fanatic:    process.env.LEMONSQUEEZY_VARIANT_FANATIC,
    upgrade:    process.env.LEMONSQUEEZY_VARIANT_UPGRADE,
    business:   process.env.LEMONSQUEEZY_VARIANT_BUSINESS,
  }

  // Log all variant env vars so we can debug
  console.log('Checkout request: target_tier=', target_tier)
  console.log('VARIANT_MAP:', JSON.stringify({
    enthusiast: VARIANT_MAP.enthusiast ? `set(${VARIANT_MAP.enthusiast})` : 'MISSING',
    fanatic:    VARIANT_MAP.fanatic    ? `set(${VARIANT_MAP.fanatic})`    : 'MISSING',
    upgrade:    VARIANT_MAP.upgrade    ? `set(${VARIANT_MAP.upgrade})`    : 'MISSING',
    business:   VARIANT_MAP.business   ? `set(${VARIANT_MAP.business})`   : 'MISSING',
  }))

  const variantId = VARIANT_MAP[target_tier]
  if (!variantId) {
    console.error(`Invalid tier: "${target_tier}" — variantId resolved to: ${variantId}`)
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Verify user is the league admin
  const { data: league } = await supabase
    .from('leagues')
    .select('id, admin_id, tier, league_name, is_comped')
    .eq('id', league_id)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) {
    return NextResponse.json({ error: 'Only the league admin can upgrade' }, { status: 403 })
  }

  // Comped leagues don't need to pay
  if (league.is_comped) {
    return NextResponse.json({ error: 'This league is already free' }, { status: 400 })
  }

  // Validate the upgrade path
  const allowed = VALID_UPGRADES[league.tier] ?? []
  if (!allowed.includes(target_tier)) {
    return NextResponse.json({ error: 'Invalid upgrade path from current tier' }, { status: 400 })
  }

  // Create Lemon Squeezy checkout session
  const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: {
              league_id,
              user_id: user.id,
              target_tier,
            },
          },
          checkout_options: {
            button_color: '#EAB308',
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/league/${league_id}?upgraded=true`,
            receipt_link_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/league/${league_id}`,
            receipt_thank_you_note: `Thanks for upgrading ${league.league_name}! Your new member limit is now active.`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(process.env.LEMONSQUEEZY_STORE_ID),
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId),
            },
          },
        },
      },
    }),
  })

  if (!lsResponse.ok) {
    const errorData = await lsResponse.json().catch(() => ({}))
    console.error('LS checkout creation failed:', errorData)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  const data = await lsResponse.json()
  const checkoutUrl = data.data?.attributes?.url

  if (!checkoutUrl) {
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
  }

  return NextResponse.json({ url: checkoutUrl })
}