// app/api/admin/upload-logo/route.js
//
// POST /api/admin/upload-logo
// Body: multipart/form-data with fields: leagueId, file
// Auth: must be superadmin
//
// This is identical in logic to /api/league-admin/upload-logo but
// accessible to superadmins for any league without being a member.

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

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

  const adminSupabase = createAdminClient()

  const ext = file.type === 'image/jpeg' ? 'jpg'
             : file.type === 'image/png'  ? 'png'
             : file.type === 'image/webp' ? 'webp'
             : 'gif'

  const storagePath = `${leagueId}/logo.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminSupabase.storage
    .from('league-logos')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminSupabase.storage
    .from('league-logos')
    .getPublicUrl(storagePath)

  const logoUrl = `${publicUrl}?t=${Date.now()}`

  const { error: dbError } = await adminSupabase
    .from('leagues')
    .update({ logo_url: logoUrl })
    .eq('id', leagueId)

  if (dbError) {
    console.error('DB update error:', dbError)
    return NextResponse.json({ error: 'Failed to save logo URL' }, { status: 500 })
  }

  return NextResponse.json({ logoUrl })
}