import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // This will refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, dark_mode')
    .eq('id', user?.id)
    .single()

  // Set theme cookie for zero-flash dark mode
  if (profile?.dark_mode !== undefined) {
    const themeValue = profile.dark_mode ? 'dark' : 'light'
    supabaseResponse.cookies.set('theme', themeValue, {
      path: '/',
      httpOnly: false, // Allow client-side reading
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Define protected routes that require authentication
  const protectedRoutes = ['/feed', '/settings', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Define auth routes
  const authRoutes = ['/login', '/signup', '/auth']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    // Not authenticated, redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && profile && !profile.onboarded && pathname !== '/onboarding') {
    // User is logged in but not onboarded, force onboarding
    const onboardingUrl = new URL('/onboarding', request.url)
    return NextResponse.redirect(onboardingUrl)
  }

  if (user && isAuthRoute && pathname !== '/auth/confirmed' && pathname !== '/auth/check-email') {
    // User is authenticated, redirect away from auth pages (except for specific confirmation flows)
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're using NextResponse.next() instead, only change the cookies set on that response.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
