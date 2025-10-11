"use client";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  useEffect(() => {
    // Extract tokens from URL params for session exchange
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);

    // Check for confirmation tokens in hash
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (accessToken && refreshToken && type === 'signup') {
      // Exchange tokens to establish session
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(async ({ data: { session }, error }) => {
        if (error || !session) {
          console.error('Session exchange failed:', error);
          setStatus('failed');
          setTimeout(() => {
            redirect('/login?error=session_exchange_failed');
          }, 2000);
          return;
        }

        // Session established successfully! Check for profile/onboarding
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('id', session.user.id)
            .single();

          if (!profile || !profile.onboarded) {
            // User needs onboarding
            setOnboardingRequired(true);
            setStatus('success');
            setTimeout(() => {
              redirect('/auth/onboarding?from=email_confirmation&cross_device=true');
            }, 1500);
          } else {
            // User is already onboarded, go home
            setStatus('success');
            setTimeout(() => {
              redirect('/');
            }, 1500);
          }
        } catch (error) {
          console.error('Profile check error:', error);
          setStatus('failed');
          setTimeout(() => {
            redirect('/login?error=profile_check_failed');
          }, 2000);
        }
      });
    } else if (accessToken && refreshToken && type === 'recovery') {
      // Password reset - not signup confirmation
      setStatus('failed');
      setTimeout(() => {
        redirect('/login?error=invalid_confirmation_type');
      }, 2000);
    } else {
      // No tokens found - invalid confirmation attempt
      console.error('No tokens found in URL');
      setStatus('failed');
      setTimeout(() => {
        redirect('/login?error=no_tokens');
      }, 2000);
    }
  }, []);

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
