import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🔥 Middleware started - Path:', request.nextUrl.pathname)

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

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Define auth routes - these should not trigger onboarding checks
  const authRoutes = ['/login', '/signup', '/auth/check', '/auth/confirm']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Always bypass checks for onboarding page itself and static assets
  if (pathname === '/auth/onboarding' ||
      pathname.startsWith('/_next/') ||
      pathname.includes('.')) {
    return supabaseResponse
  }

  // Universal onboarding guard: Check if authenticated user has profile row
  if (user && !isAuthRoute) {
    // Debug logging - remove after testing
    console.log('🛡️ Onboarding Guard Check - User:', user.id, 'Path:', pathname, 'Is Auth Route:', isAuthRoute)

    try {
      // Single RLS-respecting SQL query: select 1 from profiles where id = auth.uid() limit 1
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id') // Efficient: select 1 limit 1 equivalent
        .eq('id', user.id)
        .single()

      console.log('🛡️ Profile query result - error:', error, 'profile:', profile, 'condition check:', error || !profile)

      // If no profile row found, redirect to onboarding
      if (error || !profile) {
        console.log('🚨 Onboarding guard triggered! Redirecting to onboarding for user:', user.id)
        const onboardingUrl = new URL('/auth/onboarding', request.url)

        // Preserve callback URL for post-onboarding redirect
        const currentUrl = new URL(request.url)
        const callbackUrl = currentUrl.searchParams.get('callbackUrl')
        if (callbackUrl && !callbackUrl.includes('onboarding')) {
          onboardingUrl.searchParams.set('callbackUrl', callbackUrl)
        }

        console.log('🚨 Redirecting to:', onboardingUrl.toString())
        return NextResponse.redirect(onboardingUrl)
      } else {
        console.log('✅ Profile exists for user:', user.id, '- proceeding normally')
      }

      // Set theme cookie for zero-flash dark mode if profile exists and has dark_mode
      const { data: profileWithTheme } = await supabase
        .from('profiles')
        .select('dark_mode')
        .eq('id', user.id)
        .single()

      if (profileWithTheme?.dark_mode !== undefined) {
        const themeValue = profileWithTheme.dark_mode ? 'dark' : 'light'
        supabaseResponse.cookies.set('theme', themeValue, {
          path: '/',
          httpOnly: false, // Allow client-side reading
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }
    } catch (err) {
      console.error('Onboarding guard error:', err)
      // Continue to page - don't block user due to errors
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

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're using NextResponse.next() instead, only change the cookies set on that response.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets
     */
    '/:path*',
  ],
}