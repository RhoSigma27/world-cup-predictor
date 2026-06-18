// app/api/mini/league-admin/send-standings-email/route.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { scoreMiniLeague } from '@/lib/miniScoringEngine'
import { KO_ROUNDS } from '@/lib/worldcup'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildEmailHtml({ leagueName, logoUrl, adminMessage, standings, standingsUrl }) {
  const placeEmoji = (place) => place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `${place}.`
  const top5 = standings.slice(0, 5)

  const tableRows = top5.map(s => `
    <tr style="border-bottom: 1px solid #374151;">
      <td style="padding: 10px 12px; font-size: 18px; width: 40px;">${placeEmoji(s.place)}</td>
      <td style="padding: 10px 12px; color: #ffffff; font-weight: 500;">${s.name}</td>
      <td style="padding: 10px 12px; text-align: right; font-size: 20px; font-weight: 700; color: #f59e0b;">${s.total}</td>
    </tr>
  `).join('')

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${leagueName}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #f59e0b;margin-bottom:12px;" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:#b45309;display:inline-flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:white;margin-bottom:12px;">${leagueName.charAt(0).toUpperCase()}</div>`

  const messageSection = adminMessage?.trim()
    ? `<div style="background:#1f2937;border-left:3px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:24px 0;">
        <p style="color:#d1d5db;font-size:15px;line-height:1.6;margin:0;">${adminMessage.trim().replace(/\n/g, '<br/>')}</p>
      </div>`
    : ''

  const moreRows = standings.length > 5
    ? `<tr><td colspan="3" style="padding:12px;text-align:center;">
        <a href="${standingsUrl}" style="color:#f59e0b;font-size:13px;text-decoration:none;">See full standings →</a>
      </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="height:4px;background:#f59e0b;border-radius:2px;margin-bottom:32px;"></div>
    <div style="text-align:center;margin-bottom:24px;">
      ${logoSection}
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 4px 0;">${leagueName}</h1>
      <p style="color:#9ca3af;font-size:13px;margin:0;">🥊 Knockout Mini-Game Standings · World Cup 2026</p>
    </div>
    ${messageSection}
    <div style="background:#111827;border-radius:12px;overflow:hidden;margin:24px 0;">
      <div style="background:rgba(245,158,11,0.1);padding:12px 16px;">
        <span style="color:#f59e0b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">🏅 Current Standings</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #374151;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">#</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Player</th>
            <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Points</th>
          </tr>
        </thead>
        <tbody>${tableRows}${moreRows}</tbody>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${standingsUrl}" style="display:inline-block;background:#f59e0b;color:#030712;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
        View Full Standings →
      </a>
    </div>
    <div style="border-top:1px solid #1f2937;margin-top:32px;padding-top:20px;text-align:center;">
      <p style="color:#4b5563;font-size:12px;margin:0 0 4px 0;">
        You're receiving this because you're a member of <strong style="color:#6b7280;">${leagueName}</strong> on World Cup Predictor 2026.
      </p>
      <p style="color:#374151;font-size:11px;margin:0;">
        <a href="https://thematchpredictor.com" style="color:#4b5563;text-decoration:none;">thematchpredictor.com</a>
      </p>
    </div>
    <div style="height:4px;background:#f59e0b;border-radius:2px;margin-top:32px;"></div>
  </div>
</body>
</html>`
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { leagueId, message } = await request.json()
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const adminSupabase = createAdminClient()

    const { data: league } = await adminSupabase
      .from('mini_leagues')
      .select('id, league_name, admin_id, logo_url, last_email_sent_at, email_sends_today, email_sends_reset_date')
      .eq('id', leagueId)
      .single()

    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
    if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Rate limit: 2 per day
    const today = new Date().toISOString().split('T')[0]
    const resetDate = league.email_sends_reset_date
    const sendsToday = resetDate === today ? (league.email_sends_today || 0) : 0

    if (sendsToday >= 2) {
      return NextResponse.json({
        error: 'Daily limit reached. You can send up to 2 emails per day per league.'
      }, { status: 429 })
    }

    // Fetch members with emails
    const { data: membersRaw } = await adminSupabase
      .from('mini_league_members')
      .select(`
        user_id,
        nickname,
        profiles (
          display_name,
          email,
          is_banned
        )
      `)
      .eq('league_id', leagueId)

    const members = (membersRaw || []).filter(m => !m.profiles?.is_banned && m.profiles?.email)

    if (members.length === 0) {
      return NextResponse.json({ error: 'No members to email' }, { status: 400 })
    }

    // Compute standings using miniScoringEngine
    const [{ data: allSemiPicks }, { data: allKoPreds }, { data: koFixtures }] = await Promise.all([
      adminSupabase.from('mini_semi_picks').select('user_id, team').eq('mini_league_id', leagueId),
      adminSupabase.from('mini_ko_predictions').select('user_id, fixture_id, predicted_winner').eq('mini_league_id', leagueId),
      adminSupabase.from('fixtures').select('*').in('round', KO_ROUNDS).order('match_number', { ascending: true }),
    ])

    const scored = scoreMiniLeague(members, allSemiPicks || [], allKoPreds || [], koFixtures || [])

    let place = 1
    const standings = scored.map((s, i) => {
      if (i > 0 && s.total !== scored[i - 1].total) place = i + 1
      return { ...s, place }
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
    const standingsUrl = `${siteUrl}/mini/league/${leagueId}/standings`

    const html = buildEmailHtml({
      leagueName:   league.league_name,
      logoUrl:      league.logo_url || null,
      adminMessage: message || '',
      standings,
      standingsUrl,
    })

    const recipientEmails = members.map(m => m.profiles.email)

    const { error: sendError } = await resend.emails.send({
      from: 'World Cup Predictor <noreply@thematchpredictor.com>',
      to:   'noreply@thematchpredictor.com',
      bcc:  recipientEmails,
      subject: `📊 ${league.league_name} — Mini-Game Standings`,
      html,
    })

    if (sendError) {
      console.error('Mini standings email error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update rate limit counters
    await adminSupabase
      .from('mini_leagues')
      .update({
        last_email_sent_at:    new Date().toISOString(),
        email_sends_today:     sendsToday + 1,
        email_sends_reset_date: today,
      })
      .eq('id', leagueId)

    return NextResponse.json({
      success: true,
      recipientCount: recipientEmails.length,
      sendsRemaining: 1 - sendsToday,
    })
  } catch (err) {
    console.error('Mini send standings email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}