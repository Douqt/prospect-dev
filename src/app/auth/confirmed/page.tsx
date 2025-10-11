"use client";
import { createServerClient } from '@/lib/supabase-server'
import { access } from 'fs';
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default async function ConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const supabase = await createServerClient()

  // 1. PKCE token automatically exchanged → session cookie planted (cross-device)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 2. Onboarding guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/onboarding')
  redirect('/feed')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 bg-popover border border-border rounded-lg">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-semibold text-primary mb-2">
              Confirming your email
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Establishing your session...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </>
        )}

        {status === 'success' && onboardingRequired && (
          <>
            <h1 className="text-2xl font-semibold text-primary mb-2">
              Email confirmed! 🎉
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Session established! Taking you to complete your profile...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </>
        )}

        {status === 'success' && !onboardingRequired && (
          <>
            <h1 className="text-2xl font-semibold text-primary mb-2">
              Welcome back! 🎉
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is ready. Redirecting...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <h1 className="text-2xl font-semibold text-red-500 mb-2">
              Confirmation failed
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              There was an issue establishing your session. Please try again or contact support.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
