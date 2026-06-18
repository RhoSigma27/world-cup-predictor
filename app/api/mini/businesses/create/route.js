// app/api/mini/businesses/create/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { league_name } = body

  if (!league_name?.trim()) {
    return NextResponse.json({ error: 'League name is required' }, { status: 400 })
  }

  // Generate a unique invite code — retry once on collision (extremely unlikely)
  const adminSupabase = createAdminClient()
  let inviteCode = generateInviteCode()
  const { data: existing } = await adminSupabase
    .from('mini_leagues')
    .select('id')
    .eq('invite_code', inviteCode)
    .maybeSingle()
  if (existing) inviteCode = generateInviteCode()

  // Create the mini league row — tier stays 'hobby' until webhook confirms payment
  const { data: league, error: leagueError } = await adminSupabase
    .from('mini_leagues')
    .insert({
      league_name: league_name.trim(),
      admin_id: user.id,
      invite_code: inviteCode,
      tier: 'hobby', // upgraded to 'business' by webhook on payment
    })
    .select()
    .single()

  if (leagueError) {
    console.error('mini/businesses/create: insert failed', leagueError)
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 })
  }

  // Add admin as first member
  const { error: memberError } = await adminSupabase
    .from('mini_league_members')
    .insert({
      league_id: league.id,
      user_id: user.id,
    })

  if (memberError) {
    console.error('mini/businesses/create: member insert failed', memberError)
    // Non-fatal — league exists, admin can re-join. Log and continue.
  }

  // Read env var fresh (avoids module-level caching issues on Vercel)
  const variantId = process.env.LEMONSQUEEZY_VARIANT_BUSINESS ?? '1706320'

  console.log('mini/businesses/create: creating LS checkout, variantId=', variantId)

  // Create Lemon Squeezy checkout
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
              league_id:   league.id,
              user_id:     user.id,
              target_tier: 'business',
              league_type: 'mini',   // tells webhook to update mini_leagues not leagues
            },
          },
          checkout_options: {
            button_color: '#EAB308',
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/mini/league/${league.id}?new=true`,
            receipt_link_url: `${process.env.NEXT_PUBLIC_SITE_URL}/mini/league/${league.id}`,
            receipt_thank_you_note: `Thanks for setting up ${league_name.trim()}! Your league is ready — share the QR card and let the predictions begin.`,
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
    console.error('mini/businesses/create: LS checkout failed', errorData)
    // Clean up the league row we just created so user can try again cleanly
    await adminSupabase.from('mini_leagues').delete().eq('id', league.id)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  const data = await lsResponse.json()
  const checkoutUrl = data.data?.attributes?.url

  if (!checkoutUrl) {
    await adminSupabase.from('mini_leagues').delete().eq('id', league.id)
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
  }

  return NextResponse.json({ checkout_url: checkoutUrl })
}