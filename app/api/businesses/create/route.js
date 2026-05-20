// app/api/businesses/create/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// Generate a random 8-character invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { league_name } = await request.json()
  if (!league_name?.trim()) {
    return NextResponse.json({ error: 'League name is required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Generate a unique invite code (retry on collision)
  let invite_code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    const { data: existing } = await adminSupabase
      .from('leagues')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle()
    if (!existing) { invite_code = code; break }
  }
  if (!invite_code) {
    return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 })
  }

  // Create the league — starts on hobby tier; webhook upgrades to business on payment
  const { data: league, error: leagueError } = await adminSupabase
    .from('leagues')
    .insert({
      league_name: league_name.trim(),
      invite_code,
      admin_id: user.id,
      tier: 'hobby',
    })
    .select()
    .single()

  if (leagueError || !league) {
    console.error('create business league error:', leagueError)
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 })
  }

  // Add creator as a member
  await adminSupabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id })

  // Create Lemon Squeezy checkout for Business tier
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
              league_id: league.id,
              user_id: user.id,
              target_tier: 'business',
            },
          },
          checkout_options: {
            button_color: '#EAB308',
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/league/${league.id}?upgraded=true`,
            receipt_link_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/league/${league.id}`,
            receipt_thank_you_note: `Thanks for setting up ${league_name.trim()} as a Business League! Your QR card and branding tools are now active.`,
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
              id: String(process.env.LEMONSQUEEZY_VARIANT_BUSINESS),
            },
          },
        },
      },
    }),
  })

  if (!lsResponse.ok) {
    const lsError = await lsResponse.json().catch(() => ({}))
    console.error('LS checkout creation failed:', JSON.stringify(lsError))
    await adminSupabase.from('league_members').delete().eq('league_id', league.id)
    await adminSupabase.from('leagues').delete().eq('id', league.id)
    return NextResponse.json({ error: 'Failed to create checkout — please try again', detail: lsError }, { status: 500 })
  }

  const data = await lsResponse.json()
  const checkoutUrl = data.data?.attributes?.url

  if (!checkoutUrl) {
    await adminSupabase.from('league_members').delete().eq('league_id', league.id)
    await adminSupabase.from('leagues').delete().eq('id', league.id)
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
  }

  return NextResponse.json({ checkout_url: checkoutUrl, league_id: league.id })
}