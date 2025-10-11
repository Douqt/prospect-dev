import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Debug utility for testing middleware authentication
export async function debugAuthMiddleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll: () => {},
      },
    }
  )

  console.log('🧪 Auth Debug - Request URL:', request.url)
  console.log('🧪 Auth Debug - Request path:', request.nextUrl.pathname)

  // Check session
  const { data: { user }, error: sessionError } = await supabase.auth.getUser()
  console.log('🧪 Session check:', {
    user: user ? { id: user.id, email: user.email } : null,
    error: sessionError
  })

  if (user) {
    // Check profile existence with different queries
    console.log('🧪 Testing profile queries for user:', user.id)

    // Query 1: Use the exact query from middleware
    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    console.log('🧪 Profile query (middleware style):', {
      data: profileResult,
      error: profileError,
      exists: !profileError && !!profileResult
    })

    // Query 2: Check if any profile exists for this user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)

    console.log('🧪 Profile query (all fields):', {
      data: profiles,
      error: profilesError,
      count: profiles?.length || 0
    })

    // Query 3: List all profiles to see what exists (for debugging)
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(10)

    console.log('🧪 All profiles in system (limited):', {
      count: allProfiles?.length || 0,
      sample: allProfiles?.[0] || null,
      error: allError
    })

    // Query 4: RLS test - try to query without filtering by id
    const { data: unrestricted, error: unrestrictedError } = await supabase
      .from('profiles')
      .select('id')
      .limit(5)

    console.log('🧪 Unrestricted profile query (RLS test):', {
      data: unrestricted,
      error: unrestrictedError
    })
  }

  console.log('🧪 ======= END AUTH DEBUG ========\n')

  return { user }
}

// Client-side debug utility
export async function debugAuthClient() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('🧪 Client Debug - Starting auth session check...')

    const { data: { session }, error } = await supabase.auth.getSession()

    console.log('🧪 Client Session:', {
      user: session?.user ? { id: session.user.id, email: session.user.email } : null,
      error,
      expires_at: session?.expires_at
    })

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      console.log('🧪 Client Profile Check:', {
        profile,
        error: profileError,
        profileExists: !profileError && !!profile
      })
    }

    console.log('🧪 ======= END CLIENT DEBUG ========\n')

    return { session }
  } catch (err) {
    console.error('🧪 Client debug error:', err)
    return { error: err }
  }
}
