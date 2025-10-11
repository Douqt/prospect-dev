import { createServerClient } from '@/lib/supabase-server'
import { redirect } from "next/navigation";

export default async function ConfirmedPage() {
  let status: 'loading' | 'success' | 'failed' = 'loading';
  let onboardingRequired: boolean = false;

  const supabase = await createServerClient()

  // 1. PKCE token automatically exchanged → session cookie planted (cross-device)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    status = 'failed';
    // No redirect, show failed on UI
  } else {
    // 2. Onboarding guard
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      onboardingRequired = true;
      redirect('/auth/onboarding')
    } else {
      status = 'success';
      redirect('/feed')
    }
  }

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
