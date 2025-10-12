import { createServerClient } from '@/lib/supabase-server';

export async function getServerTheme() {
  try {
    const supabase = await createServerClient();

    // Get authenticated user data (security-critical operation)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // For non-authenticated users, return null to let client decide
      return null;
    }

    // Get user preferences
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
