import { createAdminClient } from '@/lib/supabase-admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert decimal odds to implied probability, normalised to sum to 100%
function toImpliedProbs(home, draw, away) {
  const raw = {
    home: 1 / home,
    draw: 1 / draw,
    away: 1 / away,
  }
  const total = raw.home + raw.draw + raw.away
  return {
    home_prob: Math.round((raw.home / total) * 100 * 100) / 100,
    draw_prob: Math.round((raw.draw / total) * 100 * 100) / 100,
    away_prob: Math.round((raw.away / total) * 100 * 100) / 100,
  }
}

// Normalise team names from The Odds API to match our DB
// The Odds API uses different spellings for some teams
const TEAM_NAME_MAP = {
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia & Herzegovina':   'Bosnia-Herzegovina',
  "Cote d'Ivoire":          'Ivory Coast',
  "Côte d'Ivoire":          'Ivory Coast',
  'Cape Verde':              'Cape Verde',
  'DR Congo':                'DR Congo',
  'Congo DR':                'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Turkey':                  'Türkiye',
  'South Korea':             'South Korea',
  'Korea Republic':          'South Korea',
  'USA':                     'USA',
  'United States':           'USA',
}

function normaliseTeam(name) {
  return TEAM_NAME_MAP[name] || name
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request) {
  // Verify cron secret to prevent unauthorised calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ODDS_API_KEY not set' }, { status: 500 })
  }

  try {
    // Fetch odds from The Odds API — h2h market, uk region, single credit
    const oddsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal`,
      { next: { revalidate: 0 } }
    )

    if (!oddsRes.ok) {
      const text = await oddsRes.text()
      return Response.json({ error: `Odds API error: ${oddsRes.status}`, detail: text }, { status: 502 })
    }

    const oddsData = await oddsRes.json()

    // Log remaining credits for monitoring
    const creditsUsed = oddsRes.headers.get('x-requests-used')
    const creditsRemaining = oddsRes.headers.get('x-requests-remaining')
    console.log(`Odds API credits — used: ${creditsUsed}, remaining: ${creditsRemaining}`)

    if (!oddsData || oddsData.length === 0) {
      return Response.json({ message: 'No odds available yet — tournament may not be in season', credits_remaining: creditsRemaining })
    }

    // Get all fixtures from DB so we can match by team names
    const supabase = createAdminClient()
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, home_team, away_team, match_number')
      .order('match_number')

    if (fixturesError) throw fixturesError

    // Build a lookup: "HomeTeam|AwayTeam" → fixture_id
    const fixtureLookup = {}
    for (const f of fixtures) {
      if (f.home_team && f.away_team) {
        fixtureLookup[`${f.home_team}|${f.away_team}`] = f.id
        // Also store reverse for safety
        fixtureLookup[`${f.away_team}|${f.home_team}`] = f.id
      }
    }

    const upserts = []
    let matched = 0
    let unmatched = 0

    for (const event of oddsData) {
      const homeTeam = normaliseTeam(event.home_team)
      const awayTeam = normaliseTeam(event.away_team)

      // Find fixture — try both home|away and away|home
      const fixtureId =
        fixtureLookup[`${homeTeam}|${awayTeam}`] ||
        fixtureLookup[`${awayTeam}|${homeTeam}`]

      if (!fixtureId) {
        console.warn(`No fixture match for: ${homeTeam} vs ${awayTeam}`)
        unmatched++
        continue
      }

      // Average h2h odds across all bookmakers
      let homeOddsSum = 0, drawOddsSum = 0, awayOddsSum = 0, count = 0

      for (const bookmaker of event.bookmakers) {
        const h2h = bookmaker.markets?.find(m => m.key === 'h2h')
        if (!h2h) continue

        const homeOutcome = h2h.outcomes.find(o => normaliseTeam(o.name) === homeTeam)
        const awayOutcome = h2h.outcomes.find(o => normaliseTeam(o.name) === awayTeam)
        const drawOutcome = h2h.outcomes.find(o => o.name === 'Draw')

        if (!homeOutcome || !awayOutcome || !drawOutcome) continue

        homeOddsSum += homeOutcome.price
        awayOddsSum += awayOutcome.price
        drawOddsSum += drawOutcome.price
        count++
      }

      if (count === 0) continue

      const avgHome = homeOddsSum / count
      const avgDraw = drawOddsSum / count
      const avgAway = awayOddsSum / count

      const probs = toImpliedProbs(avgHome, avgDraw, avgAway)

      upserts.push({
        fixture_id: fixtureId,
        home_prob:  probs.home_prob,
        draw_prob:  probs.draw_prob,
        away_prob:  probs.away_prob,
        fetched_at: new Date().toISOString(),
      })
      matched++
    }

    // Upsert to Supabase
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('fixture_odds')
        .upsert(upserts, { onConflict: 'fixture_id' })

      if (upsertError) throw upsertError
    }

    return Response.json({
      success: true,
      matched,
      unmatched,
      upserted: upserts.length,
      credits_remaining: creditsRemaining,
    })

  } catch (err) {
    console.error('refresh-odds error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}