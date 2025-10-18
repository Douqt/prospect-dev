import { createServerClient as supabaseCreateServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase server client with proper cookie handling for SSR
 * Configured for Next.js server components and API routes
 * @returns Promise resolving to configured Supabase client
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return supabaseCreateServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Export for backwards compatibility
export { createServerClient as createClient };
