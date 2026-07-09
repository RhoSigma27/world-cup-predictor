import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request) {
  try {
    const body = await request.json()
    const { game, event, anon_id, meta } = body

    if (!game || !event) {
      return Response.json({ error: 'missing game or event' }, { status: 400 })
    }

    const supabase = createAdminClient()
    await supabase.from('game_events').insert({
      game_slug: game,
      event_type: event,
      anon_id: anon_id || null,
      meta: meta || null,
    })

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false }, { status: 200 })
  }
}