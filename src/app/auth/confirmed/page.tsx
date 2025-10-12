import { createServerClient } from '@/lib/supabase-server'
import { redirect } from "next/navigation";
import { headers } from 'next/headers';
import { cookies } from 'next/headers';

export default async function ConfirmedPage() {
  // Create server client for proper auth handling across devices
  const supabase = await createServerClient();

  try {
    // Get the current session
    const { data: { session }, error: exchangeErr } = await supabase.auth.getSession();

    if (exchangeErr || !session) {
      console.error('Session exchange failed:', exchangeErr);
      // Redirect to login on auth failure
      redirect('/login?error=exchange');
    }

    // Check onboarding status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, onboarded')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile check failed:', profileError);
      // Still redirect to onboarding if we can't check - better to let them try
      redirect('/auth/onboarding');
    }

    if (!profile || !profile.onboarded) {
      // User needs onboarding
      redirect('/auth/onboarding');
    } else {
      // User is fully onboarded, redirect to home
      redirect('/');
    }
  } catch (error) {
    console.error('Confirmation page error:', error);
    // Redirect to login on any error
    redirect('/login?error=confirmation');
  }

  // This should never be reached due to redirects above, but Next.js requires a return
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 bg-popover border border-border rounded-lg">
        <h1 className="text-2xl font-semibold text-red-500 mb-2">
          Confirmation failed
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          There was an issue establishing your session. Please try again or contact support.
        </p>
      </div>
    </div>
  );
}
