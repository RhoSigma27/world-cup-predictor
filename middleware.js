import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // If user is not signed in and trying to access a protected route
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Protect admin routes
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If user is signed in and tries to visit signin page, redirect to dashboard
  if (user && request.nextUrl.pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check if user is banned — allow /banned and /tournament pages only
  if (user) {
    const pathname = request.nextUrl.pathname
    const isAllowed =
      pathname.startsWith('/banned') ||
      pathname.startsWith('/tournament') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api')

    if (!isAllowed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', user.id)
        .single()

      if (profile?.is_banned) {
        return NextResponse.redirect(new URL('/banned', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}