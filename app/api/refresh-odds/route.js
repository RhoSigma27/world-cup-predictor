import { createAdminClient } from '@/lib/supabase-admin'

function toImpliedProbs(home, draw, away) {
  const rawHome = 1 / home
  const rawDraw = 1 / draw
  const rawAway = 1 / away
  const total = rawHome + rawDraw + rawAway
  return {
    home_prob: Math.round((rawHome / total) * 10000) / 100,
    draw_prob: Math.round((rawDraw / total) * 10000) / 100,
    away_prob: Math.round((rawAway / total) * 10000) / 100,
  }
}

const TEAM_NAME_MAP = {
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
  "Cote d'Ivoire": 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde Islands': 'Cape Verde',
  'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Turkey': 'Türkiye',
  'Korea Republic': 'South Korea',
  'United States': 'USA',
}

function normaliseTeam(name) {
  return TEAM_NAME_MAP[name] || name
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ODDS_API_KEY not set' }, { status: 500 })
  }

  try {
    const oddsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal`
    )

    if (!oddsRes.ok) {
      const text = await oddsRes.text()
      return Response.json({ error: `Odds API error: ${oddsRes.status}`, detail: text }, { status: 502 })
    }

    const oddsData = await oddsRes.json()
    const creditsRemaining = oddsRes.headers.get('x-requests-remaining')

    if (!oddsData || oddsData.length === 0) {
      return Response.json({ message: 'No odds available yet', credits_remaining: creditsRemaining })
    }

    const supabase = createAdminClient()
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, home_team, away_team')

    if (fixturesError) throw fixturesError

    const fixtureLookup = {}
    for (const f of fixtures) {
      if (f.home_team && f.away_team) {
        fixtureLookup[`${f.home_team}|${f.away_team}`] = f.id
        fixtureLookup[`${f.away_team}|${f.home_team}`] = f.id
      }
    }

    const upserts = []
    let matched = 0
    let unmatched = 0

    for (const event of oddsData) {
      const homeTeam = normaliseTeam(event.home_team)
      const awayTeam = normaliseTeam(event.away_team)
      const fixtureId = fixtureLookup[`${homeTeam}|${awayTeam}`] || fixtureLookup[`${awayTeam}|${homeTeam}`]

      if (!fixtureId) {
        unmatched++
        continue
      }

      let homeSum = 0, drawSum = 0, awaySum = 0, count = 0
      for (const bookmaker of event.bookmakers) {
        const h2h = bookmaker.markets?.find(m => m.key === 'h2h')
        if (!h2h) continue
        const homeO = h2h.outcomes.find(o => normaliseTeam(o.name) === homeTeam)
        const awayO = h2h.outcomes.find(o => normaliseTeam(o.name) === awayTeam)
        const drawO = h2h.outcomes.find(o => o.name === 'Draw')
        if (!homeO || !awayO || !drawO) continue
        homeSum += homeO.price
        awaySum += awayO.price
        drawSum += drawO.price
        count++
      }

      if (count === 0) continue

      const probs = toImpliedProbs(homeSum / count, drawSum / count, awaySum / count)
      upserts.push({ fixture_id: fixtureId, ...probs, fetched_at: new Date().toISOString() })
      matched++
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('fixture_odds')
        .upsert(upserts, { onConflict: 'fixture_id' })
      if (upsertError) throw upsertError
    }

    return Response.json({ success: true, matched, unmatched, upserted: upserts.length, credits_remaining: creditsRemaining })

  } catch (err) {
    console.error('refresh-odds error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}