// app/api/league-admin/upload-logo/route.js
//
// POST /api/league-admin/upload-logo
// Body: multipart/form-data with fields: leagueId, file
// Auth: must be the league admin (or superadmin)

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Allow up to 600 KB body (file + overhead)
export const maxDuration = 30

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form
    const formData = await request.formData()
    const leagueId = formData.get('leagueId')
    const file = formData.get('file')

    if (!leagueId || !file) {
      return NextResponse.json({ error: 'Missing leagueId or file' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 })
    }

    // Validate file size (500 KB)
    if (file.size > 512000) {
      return NextResponse.json({ error: 'File too large. Maximum 500 KB.' }, { status: 400 })
    }

    // Check caller is league admin or superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    const { data: league } = await supabase
      .from('leagues')
      .select('id, admin_id')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const isLeagueAdmin = league.admin_id === user.id
    const isSuperadmin = profile?.is_superadmin === true

    if (!isLeagueAdmin && !isSuperadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine file extension
    const ext = file.type === 'image/jpeg' ? 'jpg'
               : file.type === 'image/png'  ? 'png'
               : file.type === 'image/webp' ? 'webp'
               : 'gif'

    const storagePath = `${leagueId}/logo.${ext}`

    // Convert File to ArrayBuffer → Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage (upsert = overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from('league-logos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('league-logos')
      .getPublicUrl(storagePath)

    // Cache-bust: append timestamp so browsers pick up the new image
    const logoUrl = `${publicUrl}?t=${Date.now()}`

    // Update leagues table
    const { error: dbError } = await supabase
      .from('leagues')
      .update({ logo_url: logoUrl })
      .eq('id', leagueId)

    if (dbError) {
      console.error('DB update error:', dbError)
      return NextResponse.json({ error: 'Failed to save logo URL' }, { status: 500 })
    }

    return NextResponse.json({ logoUrl })
  } catch (err) {
    console.error('Upload logo error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}