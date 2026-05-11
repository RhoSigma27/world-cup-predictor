// app/api/league-admin/send-standings-email/route.js
//
// POST /api/league-admin/send-standings-email
// Body: { leagueId, message }
// Auth: must be league admin
// Limit: 2 emails per league per day

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Scoring Engine (minimal — result only, no chart data needed) ─────────────

function getResult(s1, s2) {
  if (s1 > s2) return 'H'
  if (s2 > s1) return 'A'
  return 'D'
}

function scoreParticipant(predictions, fixtures, extrasPred, masterExtras) {
  let groupPts = 0, koPts = 0, extrasPts = 0

  const starPicks = {
    group: extrasPred?.star_pick_group ?? null,
    R32:   extrasPred?.star_pick_r32   ?? null,
    R16:   extrasPred?.star_pick_r16   ?? null,
    QF:    extrasPred?.star_pick_qf    ?? null,
    SF:    extrasPred?.star_pick_sf    ?? null,
    FINAL: extrasPred?.star_pick_final ?? null,
  }

  for (const f of fixtures) {
    if (f.home_score == null || f.away_score == null) continue
    const pred = predictions.find(p => p.fixture_id === f.id)
    if (!pred || pred.predicted_home == null || pred.predicted_away == null) continue

    let effectiveHome = f.home_score
    let effectiveAway = f.away_score
    if (f.penalty_winner && f.home_score === f.away_score) {
      if (f.penalty_winner === f.home_team) effectiveHome += 1
      else effectiveAway += 1
    }

    const masterResult = getResult(effectiveHome, effectiveAway)
    const predResult = getResult(pred.predicted_home, pred.predicted_away)
    if (masterResult !== predResult) continue

    const roundPoints = {
      group: [10, 5], R32: [10, 5], R16: [20, 10],
      QF: [30, 15], SF: [50, 25], '3RD': [80, 40], FINAL: [80, 40],
    }
    const [base, bonus] = roundPoints[f.round] || [0, 0]
    let pts = base
    if (pred.predicted_home === effectiveHome && pred.predicted_away === effectiveAway) pts += bonus

    const roundKey = f.round === '3RD' ? 'FINAL' : f.round
    const starPick = starPicks[roundKey] ?? null
    if (starPick && (f.home_team === starPick || f.away_team === starPick)) pts *= 2

    if (f.round === 'group') groupPts += pts
    else koPts += pts
  }

  if (masterExtras) {
    if (masterExtras.total_red_cards != null && extrasPred?.predicted_red_cards != null) {
      const diff = Math.abs(masterExtras.total_red_cards - extrasPred.predicted_red_cards)
      extrasPts += diff === 0 ? 50 : Math.max(0, 50 - diff * 5)
    }
    if (masterExtras.total_goals != null && extrasPred?.predicted_total_goals != null) {
      const diff = Math.abs(masterExtras.total_goals - extrasPred.predicted_total_goals)
      extrasPts += diff === 0 ? 50 : Math.max(0, 50 - diff * 2)
    }
  }

  return groupPts + koPts + extrasPts
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function buildEmailHtml({ leagueName, logoUrl, adminMessage, standings, standingsUrl }) {
  const placeEmoji = (place) => place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `${place}.`

  const top5 = standings.slice(0, 5)

  const tableRows = top5.map(s => `
    <tr style="border-bottom: 1px solid #374151;">
      <td style="padding: 10px 12px; font-size: 18px; width: 40px;">${placeEmoji(s.place)}</td>
      <td style="padding: 10px 12px; color: #ffffff; font-weight: 500;">${s.displayName}</td>
      <td style="padding: 10px 12px; text-align: right; font-size: 20px; font-weight: 700; color: #f59e0b;">${s.total}</td>
    </tr>
  `).join('')

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${leagueName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #f59e0b; margin-bottom: 12px;" />`
    : `<div style="width: 80px; height: 80px; border-radius: 50%; background: #b45309; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; margin-bottom: 12px;">${leagueName.charAt(0).toUpperCase()}</div>`

  const messageSection = adminMessage?.trim()
    ? `<div style="background: #1f2937; border-left: 3px solid #f59e0b; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="color: #d1d5db; font-size: 15px; line-height: 1.6; margin: 0;">${adminMessage.trim().replace(/\n/g, '<br/>')}</p>
      </div>`
    : ''

  const moreRows = standings.length > 5
    ? `<tr><td colspan="3" style="padding: 12px; text-align: center;">
        <a href="${standingsUrl}" style="color: #f59e0b; font-size: 13px; text-decoration: none;">See full standings →</a>
      </td></tr>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header bar -->
    <div style="height: 4px; background: #f59e0b; border-radius: 2px; margin-bottom: 32px;"></div>

    <!-- League logo + name -->
    <div style="text-align: center; margin-bottom: 24px;">
      ${logoSection}
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 4px 0;">${leagueName}</h1>
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">Standings Update · World Cup Predictor 2026</p>
    </div>

    <!-- Admin message -->
    ${messageSection}

    <!-- Standings table -->
    <div style="background: #111827; border-radius: 12px; overflow: hidden; margin: 24px 0;">
      <div style="background: rgba(245, 158, 11, 0.1); padding: 12px 16px;">
        <span style="color: #f59e0b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">🏅 Current Standings</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #374151;">
            <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 600;">#</th>
            <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 600;">Player</th>
            <th style="padding: 10px 12px; text-align: right; color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 600;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          ${moreRows}
        </tbody>
      </table>
    </div>

    <!-- CTA button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${standingsUrl}"
        style="display: inline-block; background: #f59e0b; color: #030712; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
        View Full Standings →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 20px; text-align: center;">
      <p style="color: #4b5563; font-size: 12px; margin: 0 0 4px 0;">
        You're receiving this because you're a member of <strong style="color: #6b7280;">${leagueName}</strong> on World Cup Predictor 2026.
      </p>
      <p style="color: #374151; font-size: 11px; margin: 0;">
        <a href="https://thematchpredictor.com" style="color: #4b5563; text-decoration: none;">thematchpredictor.com</a>
      </p>
    </div>

    <!-- Bottom bar -->
    <div style="height: 4px; background: #f59e0b; border-radius: 2px; margin-top: 32px;"></div>
  </div>
</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { leagueId, message } = await request.json()
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const adminSupabase = createAdminClient()

    // Get league and verify caller is admin
    const { data: league } = await adminSupabase
      .from('leagues')
      .select('id, league_name, admin_id, logo_url, last_email_sent_at, email_sends_today, email_sends_reset_date')
      .eq('id', leagueId)
      .single()

    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
    if (league.admin_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // ── Rate limiting: 2 per day per league ──────────────────────────────────
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const resetDate = league.email_sends_reset_date
    const sendsToday = resetDate === today ? (league.email_sends_today || 0) : 0

    if (sendsToday >= 2) {
      return NextResponse.json({
        error: 'Daily limit reached. You can send up to 2 emails per day per league.'
      }, { status: 429 })
    }

    // ── Fetch members (emails server-side only, never sent to client) ─────────
    const { data: membersRaw } = await adminSupabase
      .from('league_members')
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

    // ── Fetch fixtures and compute standings ──────────────────────────────────
    const { data: fixtures } = await adminSupabase
      .from('fixtures')
      .select('*')
      .order('match_number', { ascending: true })

    const { data: allPredictions } = await adminSupabase
      .from('predictions')
      .select('*')
      .eq('league_id', leagueId)

    const { data: allExtras } = await adminSupabase
      .from('extras_predictions')
      .select('*')
      .eq('league_id', leagueId)

    const { data: masterExtras } = await adminSupabase
      .from('master_extras')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle()

    const standings = members.map(member => {
      const userPreds = allPredictions?.filter(p => p.user_id === member.user_id) || []
      const userExtras = allExtras?.find(e => e.user_id === member.user_id) || null
      const total = scoreParticipant(userPreds, fixtures || [], userExtras, masterExtras)
      return {
        userId: member.user_id,
        displayName: member.nickname || member.profiles?.display_name || 'Unknown',
        total,
      }
    })

    standings.sort((a, b) => b.total - a.total)
    let place = 1
    standings.forEach((s, i) => {
      if (i > 0 && s.total !== standings[i - 1].total) place = i + 1
      s.place = place
    })

    // ── Build and send emails ─────────────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thematchpredictor.com'
    const standingsUrl = `${siteUrl}/dashboard/league/${leagueId}/standings`

    const html = buildEmailHtml({
      leagueName: league.league_name,
      logoUrl: league.logo_url || null,
      adminMessage: message || '',
      standings,
      standingsUrl,
    })

    const recipientEmails = members.map(m => m.profiles.email)

    // Send as BCC so members don't see each other's emails
    const { error: sendError } = await resend.emails.send({
      from: 'World Cup Predictor <noreply@thematchpredictor.com>',
      to: 'noreply@thematchpredictor.com', // sender to themselves
      bcc: recipientEmails,
      subject: `📊 ${league.league_name} — Standings Update`,
      html,
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // ── Update rate limit counters ────────────────────────────────────────────
    const { error: updateError } = await adminSupabase
      .from('leagues')
      .update({
        last_email_sent_at: new Date().toISOString(),
        email_sends_today: sendsToday + 1,
        email_sends_reset_date: today,
      })
      .eq('id', leagueId)

    if (updateError) console.error('Rate limit update error:', updateError)

    return NextResponse.json({
      success: true,
      recipientCount: recipientEmails.length,
      sendsRemaining: 1 - sendsToday, // was sendsToday before this send, so remaining = 2 - (sendsToday+1)
    })

  } catch (err) {
    console.error('Send standings email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}