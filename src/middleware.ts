import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static assets and API routes to reduce recompiles
  if (pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookies directly (they're named like sb-{projectId}-auth-token)
  const cookieNames = request.cookies.getAll().map(c => c.name)
  const supabaseAuthCookies = cookieNames.filter(name => name.includes('sb-') && name.includes('-auth-token'))

  // If no Supabase auth cookies, user is not authenticated, can return early
  if (supabaseAuthCookies.length === 0) {
    // Check if this is a protected route
    const protectedRoutes = ['/feed', '/settings', '/profile']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Not a protected route, allow through
    return NextResponse.next()
  }

  // User is authenticated (has auth cookies), create Supabase client for profile checks
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll() // → { name, value }[]
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // Define auth routes - these should not trigger onboarding checks
  const authRoutes = ['/login', '/signup', '/auth/check', '/auth/confirm']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Always bypass checks for onboarding page itself and static assets
  if (pathname === '/auth/onboarding' ||
      pathname.startsWith('/_next/') ||
      pathname.includes('.')) {
    return response
  }

  // Universal onboarding guard: Check if authenticated user has profile row
  if (user && !isAuthRoute) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id') // Efficient: select 1 limit 1 equivalent
      .eq('id', user.id)
      .single()

      // If no profile row found, redirect to onboarding
      if (error || !profile) {
        const onboardingUrl = new URL('/auth/onboarding', request.url)

        // Preserve callback URL for post-onboarding redirect
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
        if (callbackUrl && !callbackUrl.includes('onboarding')) {
          onboardingUrl.searchParams.set('callbackUrl', callbackUrl)
        }

        return NextResponse.redirect(onboardingUrl)
      }

    // Set theme cookie for zero-flash dark mode if profile exists and has dark_mode
    const { data: profileWithTheme } = await supabase
      .from('profiles')
      .select('dark_mode')
      .eq('id', user.id)
      .single()

    if (profileWithTheme?.dark_mode !== undefined) {
      const themeValue = profileWithTheme.dark_mode ? 'dark' : 'light'
      response.cookies.set('theme', themeValue, {
        path     : '/',
        httpOnly : false,
        sameSite : 'lax',
        secure   : process.env.NODE_ENV === 'production',
        maxAge   : 60 * 60 * 24 * 30,
      });
    }
  }

  // Define protected routes that require authentication
  const protectedRoutes = ['/feed', '/settings', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    // Not authenticated, redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
