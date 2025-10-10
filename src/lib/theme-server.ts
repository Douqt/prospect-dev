import { createClient } from '@/lib/supabase-server';

export async function getServerTheme() {
  try {
    const supabase = await createClient();

    // Get user session to check if logged in
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      // For non-authenticated users, return null to let client decide
      return null;
    }

    // Get user preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('dark_mode')
      .eq('id', session.user.id)
      .single();

    return profile?.dark_mode ? 'dark' : 'light';
  } catch (error) {
    console.error('Error fetching server theme:', error);
    return null;
  }
}
