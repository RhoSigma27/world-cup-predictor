// app/join/[code]/page.js
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { GLOBAL_LOCK_DATE } from '@/lib/predictionsLock'

const TIER_LIMITS = {
  hobby:      6,
  enthusiast: 11,
  fanatic:    Infinity,
  business:   Infinity,
}

async function notifyAdminLeagueFull(league, adminEmail, adminName) {
  if (!adminEmail) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Match Predictor <noreply@thematchpredictor.com>',
        to: adminEmail,
        subject: `Someone tried to join ${league.league_name} — league is full`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#111">Your league is full</h2>
            <p>Hi ${adminName || 'there'},</p>
            <p>Someone tried to join <strong>${league.league_name}</strong> but couldn't because you've reached the member limit for the <strong>${league.tier ?? 'Hobby'}</strong> tier.</p>
            <p>Upgrade your league to let them in:</p>
            <ul>
              <li><strong>Enthusiast</strong> — up to 11 members — £12</li>
              <li><strong>Fanatic</strong> — unlimited members — £20</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/league/${league.id}"
               style="display:inline-block;margin-top:16px;padding:12px 24px;background:#EAB308;color:#111;font-weight:bold;border-radius:8px;text-decoration:none">
              Upgrade my league →
            </a>
            <p style="margin-top:24px;color:#888;font-size:13px">
              The Match Predictor · <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#888">thematchpredictor.com</a>
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Failed to send league-full admin notification:', err)
  }
}

export default async function JoinViaLinkPage({ params }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?invite=${code}`)

  // Find the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (leagueError || !league) {
    // Could be a mini-game invite code — check and redirect if so
    const { data: miniLeague } = await supabase
      .from('mini_leagues')
      .select('id')
      .eq('invite_code', code.toUpperCase())
      .maybeSingle()

    if (miniLeague) redirect(`/mini/join/${code.toUpperCase()}`)

    redirect('/dashboard?error=invalid-invite')
  }

  // Check if already a member — existing members always get through
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect(`/dashboard/league/${league.id}`)

  // New joiner post-lockout — redirect to join page with mini-game banner
  if (new Date() >= GLOBAL_LOCK_DATE) {
    redirect('/dashboard/join-league?locked=true')
  }

  // ── Tier enforcement ──────────────────────────────────────────────────────
  const isComped = league.is_comped === true
  const limit = isComped ? Infinity : (TIER_LIMITS[league.tier ?? 'hobby'] ?? 6)

  if (isFinite(limit)) {
    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id)

    if (count >= limit) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', league.admin_id)
        .single()

      await notifyAdminLeagueFull(league, adminProfile?.email, adminProfile?.display_name)

      const params = new URLSearchParams({
        error: 'league-full',
        league_name: league.league_name,
        tier: league.tier ?? 'hobby',
        admin: adminProfile?.display_name ?? 'the league admin',
      })
      redirect(`/dashboard?${params.toString()}`)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { error: joinError } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id })

  if (joinError) {
    console.error('Join error:', joinError)
    redirect('/dashboard?error=join-failed')
  }

  redirect(`/dashboard/league/${league.id}`)
}