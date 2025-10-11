import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // If "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    let response = NextResponse.next({
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
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // User is now authenticated - check if they need onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', data.user.id)
        .single()

      if (!profile || !profile.onboarded) {
        // Redirect to onboarding if user hasn't completed it
        // Include a cross-device parameter to track multi-device flow
        const redirectionUrl = new URL(`${origin}/auth/onboarding`);
        redirectionUrl.searchParams.set('from_email', 'true');
        redirectionUrl.searchParams.set('user_id', data.user.id);
        return NextResponse.redirect(redirectionUrl.toString())
      }

      // Redirect to where they originally wanted to go or home
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
