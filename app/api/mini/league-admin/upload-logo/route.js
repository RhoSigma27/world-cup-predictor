// app/api/mini/league-admin/upload-logo/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await request.formData()
  const leagueId = formData.get('leagueId')
  const file     = formData.get('file')

  if (!leagueId || !file) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from('mini_leagues').select('admin_id, logo_url').eq('id', leagueId).single()
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ext  = file.name.split('.').pop()
  const path = `mini-logos/${leagueId}.${ext}`

  const { error: uploadError } = await adminSupabase.storage
    .from('league-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('mini upload-logo storage error', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminSupabase.storage
    .from('league-logos')
    .getPublicUrl(path)

  const { error: updateError } = await adminSupabase
    .from('mini_leagues').update({ logo_url: publicUrl }).eq('id', leagueId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, url: publicUrl })
}