// app/api/league-admin/upload-banner/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const leagueId = formData.get('leagueId')
  const file = formData.get('file')

  if (!leagueId || !file) {
    return NextResponse.json({ error: 'Missing leagueId or file' }, { status: 400 })
  }

  // Verify user is the league admin
  const { data: league } = await supabase
    .from('leagues')
    .select('id, admin_id, tier, is_comped')
    .eq('id', leagueId)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) {
    return NextResponse.json({ error: 'Only the league admin can upload a banner' }, { status: 403 })
  }

  // Gate to Business tier or comped leagues
  if (league.tier !== 'business' && !league.is_comped) {
    return NextResponse.json({ error: 'Banner upload is only available on the Business plan' }, { status: 403 })
  }

  // Validate file
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Use JPEG, PNG, WebP or GIF' }, { status: 400 })
  }
  if (file.size > 2097152) { // 2MB limit for banners
    return NextResponse.json({ error: 'File too large — maximum 2 MB' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${leagueId}/banner.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await adminSupabase.storage
    .from('league-banners')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Banner upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminSupabase.storage
    .from('league-banners')
    .getPublicUrl(path)

  // Append cache-busting timestamp
  const bannerUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await adminSupabase
    .from('leagues')
    .update({ banner_url: bannerUrl })
    .eq('id', leagueId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save banner URL' }, { status: 500 })
  }

  return NextResponse.json({ bannerUrl })
}