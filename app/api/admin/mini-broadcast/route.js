// app/api/admin/mini-broadcast/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// GET ?tier=all|hobby|enthusiast|fanatic|business — returns recipient count preview
export async function GET(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier') || 'all'

  const adminSupabase = createAdminClient()

  let query = adminSupabase.from('mini_leagues').select('admin_id, tier')
  if (tier !== 'all') query = query.eq('tier', tier)
  const { data: leagues } = await query

  // Deduplicate admins
  const adminIds = [...new Set((leagues || []).map(l => l.admin_id))]

  const { data: profiles } = await adminSupabase
    .from('profiles').select('id, email').in('id', adminIds)

  const emails = (profiles || []).filter(p => p.email).map(p => p.email)
  const uniqueEmails = [...new Set(emails)]

  return NextResponse.json({ count: uniqueEmails.length })
}

// POST { subject, message, tier } — sends broadcast
export async function POST(request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, message, tier } = await request.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  let query = adminSupabase.from('mini_leagues').select('admin_id, tier')
  if (tier && tier !== 'all') query = query.eq('tier', tier)
  const { data: leagues } = await query

  const adminIds = [...new Set((leagues || []).map(l => l.admin_id))]

  const { data: profiles } = await adminSupabase
    .from('profiles').select('id, email').in('id', adminIds)

  const uniqueEmails = [...new Set((profiles || []).filter(p => p.email).map(p => p.email))]

  if (uniqueEmails.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Send in batches of 49 (Resend BCC limit)
  const BATCH_SIZE = 49
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
  let sent = 0

  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE)
    const { error } = await resend.emails.send({
      from: 'World Cup Predictor <noreply@thematchpredictor.com>',
      to:  'noreply@thematchpredictor.com',
      bcc: batch,
      subject: subject.trim(),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#030712;color:#fff;">
          <div style="height:4px;background:#f59e0b;border-radius:2px;margin-bottom:32px;"></div>
          <h1 style="color:#f59e0b;font-size:22px;margin:0 0 8px 0;">🥊 Knockout Mini-Game</h1>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 24px 0;">World Cup Predictor 2026</p>
          <div style="background:#111827;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:#d1d5db;font-size:15px;line-height:1.7;margin:0;white-space:pre-line;">${message.trim()}</p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${siteUrl}/mini/dashboard"
              style="display:inline-block;background:#f59e0b;color:#030712;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
              Go to Mini-Game Dashboard →
            </a>
          </div>
          <div style="border-top:1px solid #1f2937;margin-top:32px;padding-top:20px;text-align:center;">
            <p style="color:#4b5563;font-size:12px;margin:0;">
              <a href="${siteUrl}" style="color:#4b5563;text-decoration:none;">thematchpredictor.com</a>
            </p>
          </div>
          <div style="height:4px;background:#f59e0b;border-radius:2px;margin-top:32px;"></div>
        </div>
      `,
    })
    if (error) {
      console.error('Mini broadcast batch error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
    sent += batch.length
  }

  return NextResponse.json({ success: true, sent })
}