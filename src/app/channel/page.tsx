import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';

export default async function ChannelPage() {
  const supabase = await createServerClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Redirect to login if not authenticated
    redirect('/login');
  }

  // Get user's profile to get their username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // If profile not found, redirect to login or handle error
    redirect('/login');
  }

  // Redirect to user's channel page
  redirect(`/channel/${profile.username}`);
}
