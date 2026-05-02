// app/api/admin/upload-logo/route.js
//
// POST /api/admin/upload-logo
// Body: multipart/form-data with fields: leagueId, file
// Auth: must be superadmin
//
// This is identical in logic to /api/league-admin/upload-logo but
// accessible to superadmins for any league without being a member.

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_superadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const leagueId = formData.get('leagueId')
    const file = formData.get('file')

    if (!leagueId || !file) {
      return NextResponse.json({ error: 'Missing leagueId or file' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 })
    }

    if (file.size > 512000) {
      return NextResponse.json({ error: 'File too large. Maximum 500 KB.' }, { status: 400 })
    }

    const ext = file.type === 'image/jpeg' ? 'jpg'
               : file.type === 'image/png'  ? 'png'
               : file.type === 'image/webp' ? 'webp'
               : 'gif'

    const storagePath = `${leagueId}/logo.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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

    const { data: { publicUrl } } = supabase.storage
      .from('league-logos')
      .getPublicUrl(storagePath)

    const logoUrl = `${publicUrl}?t=${Date.now()}`

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
    console.error('Admin upload logo error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}