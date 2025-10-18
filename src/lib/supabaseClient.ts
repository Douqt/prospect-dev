import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase project URL from environment variables
 * Must be set in NEXT_PUBLIC_SUPABASE_URL
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Supabase anonymous key from environment variables
 * Must be set in NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client instance for browser-side operations
 * Configured with SSR support for Next.js applications
 * Handles authentication state and real-time subscriptions
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
