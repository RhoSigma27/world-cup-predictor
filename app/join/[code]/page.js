import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

// Total member limits per tier (including the admin)
const TIER_LIMITS = {
  hobby:      6,   // admin + 5
  enthusiast: 11,  // admin + 10
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
    // Non-fatal — don't block the redirect if email fails
    console.error('Failed to send league-full admin notification:', err)
  }
}

export default async function JoinViaLinkPage({ params }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  // If not signed in, redirect to signin with the code saved in URL
  if (!user) {
    redirect(`/auth/signin?invite=${code}`)
  }

  // Find the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (leagueError || !league) {
    redirect('/dashboard?error=invalid-invite')
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // ── Tier enforcement ──────────────────────────────────────────────────────
    const isComped = league.is_comped === true
    const limit = isComped ? Infinity : (TIER_LIMITS[league.tier ?? 'hobby'] ?? 6)

    if (isFinite(limit)) {
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id)

      if (count >= limit) {
        // Fetch admin details for the notification email
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('id', league.admin_id)
          .single()

        // Fire-and-forget email to admin
        await notifyAdminLeagueFull(league, adminProfile?.email, adminProfile?.display_name)

        // Redirect joiner with enough context to show a helpful error
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

    // Auto-join the league
    const { error: joinError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
      })

    if (joinError) {
      console.error('Join error:', joinError)
      redirect('/dashboard?error=join-failed')
    }
  }

  redirect(`/dashboard/league/${league.id}`)
}