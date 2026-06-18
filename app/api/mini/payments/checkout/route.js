// app/api/mini/payments/checkout/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const VALID_UPGRADES = {
  hobby:      ['enthusiast', 'fanatic'],
  enthusiast: ['upgrade'],
}

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { league_id, target_tier } = await request.json()
  if (!league_id || !target_tier) {
    return NextResponse.json({ error: 'Missing league_id or target_tier' }, { status: 400 })
  }

  const VARIANT_MAP = {
    enthusiast: process.env.LEMONSQUEEZY_VARIANT_ENTHUSIAST ?? '1706290',
    fanatic:    process.env.LEMONSQUEEZY_VARIANT_FANATIC    ?? '1706300',
    upgrade:    process.env.LEMONSQUEEZY_VARIANT_UPGRADE    ?? '1706302',
  }

  const variantId = VARIANT_MAP[target_tier]
  if (!variantId) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

  const adminSupabase = createAdminClient()

  const { data: league } = await adminSupabase
    .from('mini_leagues')
    .select('id, admin_id, tier, league_name, is_comped')
    .eq('id', league_id)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Only the league admin can upgrade' }, { status: 403 })
  if (league.is_comped) return NextResponse.json({ error: 'This league is already free' }, { status: 400 })

  const allowed = VALID_UPGRADES[league.tier] ?? []
  if (!allowed.includes(target_tier)) {
    return NextResponse.json({ error: 'Invalid upgrade path' }, { status: 400 })
  }

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
              user_id:     user.id,
              target_tier,
              league_type: 'mini', // tells webhook to update mini_leagues
            },
          },
          checkout_options: { button_color: '#EAB308' },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/mini/league/${league_id}?upgraded=true`,
            receipt_link_url: `${process.env.NEXT_PUBLIC_SITE_URL}/mini/league/${league_id}`,
            receipt_thank_you_note: `Thanks for upgrading ${league.league_name}! Your new member limit is now active.`,
          },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: 'variants',  id: String(variantId) } },
        },
      },
    }),
  })

  if (!lsResponse.ok) {
    const err = await lsResponse.json().catch(() => ({}))
    console.error('mini checkout failed', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  const data = await lsResponse.json()
  const url = data.data?.attributes?.url
  if (!url) return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })

  return NextResponse.json({ url })
}