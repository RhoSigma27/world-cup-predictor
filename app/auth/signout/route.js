import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

async function signOut(request) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}

export const GET = signOut
export const POST = signOut