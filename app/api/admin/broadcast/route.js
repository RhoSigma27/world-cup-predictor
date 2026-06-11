// app/api/admin/broadcast/route.js
//
// GET  /api/admin/broadcast?tier=all   — returns recipient count preview
// POST /api/admin/broadcast            — sends broadcast email to league admins
// Auth: superadmin only

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getRecipients(adminSupabase, tier) {
  let query = adminSupabase
    .from('leagues')
    .select('admin_id')

  if (tier && tier !== 'all') {
    query = query.eq('tier', tier)
  }

  const { data: leagues, error } = await query
  if (error || !leagues?.length) return []

  // Deduplicate admin IDs
  const adminIds = [...new Set(leagues.map(l => l.admin_id).filter(Boolean))]

  // Fetch their profiles — exclude banned, exclude no email
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, email, display_name, is_banned')
    .in('id', adminIds)
    .eq('is_banned', false)
    .not('email', 'is', null)

  return (profiles || []).filter(p => p.email)
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildBroadcastHtml({ subject, message }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header bar -->
    <div style="height: 4px; background: #f59e0b; border-radius: 2px; margin-bottom: 32px;"></div>

    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 28px;">
      <p style="color: #f59e0b; font-size: 28px; font-weight: 800; margin: 0 0 4px 0;">⚽ The Match Predictor</p>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">World Cup 2026</p>
    </div>

    <!-- Subject -->
    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; text-align: center;">${subject}</h1>

    <!-- Message body -->
    <div style="background: #111827; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      <p style="color: #d1d5db; font-size: 15px; line-height: 1.7; margin: 0;">${message.trim().replace(/\n/g, '<br/>')}</p>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${siteUrl}/dashboard"
        style="display: inline-block; background: #f59e0b; color: #030712; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
        Go to your league →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 20px; text-align: center;">
      <p style="color: #4b5563; font-size: 12px; margin: 0 0 4px 0;">
        You're receiving this as a league admin on World Cup Predictor 2026.
      </p>
      <p style="color: #374151; font-size: 11px; margin: 0;">
        <a href="${siteUrl}" style="color: #4b5563; text-decoration: none;">thematchpredictor.com</a>
      </p>
    </div>

    <!-- Bottom bar -->
    <div style="height: 4px; background: #f59e0b; border-radius: 2px; margin-top: 32px;"></div>
  </div>
</body>
</html>`
}

// ─── GET — recipient count preview ───────────────────────────────────────────

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') || 'all'

    const adminSupabase = createAdminClient()
    const recipients = await getRecipients(adminSupabase, tier)

    return NextResponse.json({ count: recipients.length })
  } catch (err) {
    console.error('Broadcast count error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — send broadcast ────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { subject, message, tier } = await request.json()

    if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

    const adminSupabase = createAdminClient()
    const recipients = await getRecipients(adminSupabase, tier || 'all')

    if (!recipients.length) {
      return NextResponse.json({ error: 'No recipients found for this filter' }, { status: 400 })
    }

    const recipientEmails = recipients.map(r => r.email)
    const html = buildBroadcastHtml({ subject: subject.trim(), message: message.trim() })

    // ── Send in batches of 50 (Resend BCC limit) ──────────────────────────────
    const chunkSize = 50
    const chunks = []
    for (let i = 0; i < recipientEmails.length; i += chunkSize) {
      chunks.push(recipientEmails.slice(i, i + chunkSize))
    }

    for (const chunk of chunks) {
      const { error: sendError } = await resend.emails.send({
        from: 'The Match Predictor <noreply@thematchpredictor.com>',
        to: 'noreply@thematchpredictor.com',
        bcc: chunk,
        subject: subject.trim(),
        html,
      })

      if (sendError) {
        console.error('Resend broadcast error:', sendError)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, recipientCount: recipientEmails.length })

  } catch (err) {
    console.error('Broadcast send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}