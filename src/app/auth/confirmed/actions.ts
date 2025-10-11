// app/auth/confirmed/actions.ts
"use server";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function confirmEmail() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  /* 1. let Supabase exchange the hash → cookies */
  const { data: { session }, error: exchangeErr } = await supabase.auth.getSession()
  
  if (exchangeErr || !session) {
    return { error: exchangeErr?.message || 'No session', needsOnboarding: false }
  }

  /* 2. onboarding check */
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single()

  return {
    error: null,
    needsOnboarding: !profile
  }
}