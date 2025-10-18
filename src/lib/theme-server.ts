import { createServerClient } from '@/lib/supabase-server';

/**
 * Theme preference type
 */
export type Theme = 'light' | 'dark';

/**
 * Fetches the user's theme preference from the server
 * Used for server-side rendering to avoid theme flash
 * @returns Promise resolving to user's preferred theme or null for guests
 */
export async function getServerTheme(): Promise<Theme | null> {
  try {
    const supabase = await createServerClient();

    // Get authenticated user data (security-critical operation)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // For non-authenticated users, return null to let client decide
      return null;
    }

    // Get user preferences from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('dark_mode')
      .eq('id', user.id)
      .single();

    return profile?.dark_mode ? 'dark' : 'light';
  } catch (error) {
    console.error('Error fetching server theme:', error);
    return null;
  }
}
