"use client";
import { createBrowserClient } from '@supabase/ssr'
import { access } from 'fs';
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        /* 1. Try to get session on this device */
        const { data: { session }, error: exchangeErr } = await supabase.auth.getSession();

        let userId = session?.user?.id;
        let hasSession = !!session;

        /* If no session, try to detect from URL parameters (cross-device confirmation) */
        const urlParams = new URLSearchParams(window.location.search);
        const crossDeviceUserId = urlParams.get('user_id');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        // If no session but we have cross-device parameters, try to establish session
        if (!hasSession && (crossDeviceUserId || accessToken)) {
          console.log('Detected cross-device confirmation attempt');

          // If we have tokens in URL, try to set them
          if (accessToken && refreshToken) {
            const { data: sessionData, error: signInError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionData.session) {
              userId = sessionData.session.user.id;
              hasSession = true;
              console.log('Successfully established session from URL tokens');
            } else {
              console.error('Failed to establish session from URL tokens:', signInError);
            }
          } else if (crossDeviceUserId) {
            // User is cross-device, redirect to onboarding for this user
            console.log('Cross-device confirmation detected, redirecting to onboarding');
            setOnboardingRequired(true);
            setStatus('success');
            // Remove current params and add user_id for onboarding
            const onboardingUrl = new URL('/auth/onboarding', window.location.origin);
            onboardingUrl.searchParams.set('user_id', crossDeviceUserId);
            onboardingUrl.searchParams.set('cross_device', 'true');
            onboardingUrl.searchParams.set('from_email', 'true');
            setTimeout(() => window.location.href = onboardingUrl.toString(), 1500);
            return;
          }
        }

        if (!hasSession || !userId) {
          console.error('No session or user ID available', { hasSession, userId, exchangeErr });
          setStatus('failed');
          setTimeout(() => redirect('/login?error=exchange'), 2000);
          return;
        }

        /* 2. onboarding check using server API (more reliable for cross-device) */
        try {
          const response = await fetch(`/api/onboarding-check?userId=${userId}`);
          if (!response.ok) {
            throw new Error(`API response: ${response.status}`);
          }
          const onboardingData = await response.json();

          console.log('Onboarding check result:', onboardingData);

          if (!onboardingData.exists || !onboardingData.onboarded) {
            setOnboardingRequired(true);
            setStatus('success');
            // Pass user_id to onboarding for cross-device handling
            const onboardingUrl = new URL('/auth/onboarding', window.location.origin);
            onboardingUrl.searchParams.set('user_id', userId);
            onboardingUrl.searchParams.set('from_email', 'true');
            if (!hasSession) {
              onboardingUrl.searchParams.set('cross_device', 'true');
            }
            setTimeout(() => window.location.href = onboardingUrl.toString(), 1500);
          } else {
            setStatus('success');
            setTimeout(() => redirect('/'), 1500);
          }
        } catch (apiError) {
          console.error('Onboarding check API failed, falling back to client-side:', apiError);

          // Fallback to client-side check
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

          if (profileError || !profile) {
            setOnboardingRequired(true);
            setStatus('success');
            const onboardingUrl = new URL('/auth/onboarding', window.location.origin);
            onboardingUrl.searchParams.set('user_id', userId);
            onboardingUrl.searchParams.set('from_email', 'true');
            if (!hasSession) {
              onboardingUrl.searchParams.set('cross_device', 'true');
            }
            setTimeout(() => window.location.href = onboardingUrl.toString(), 1500);
          } else {
            setStatus('success');
            setTimeout(() => redirect('/'), 1500);
          }
        }
      } catch (error) {
        console.error('Confirmation page error:', error);
        setStatus('failed');
        setTimeout(() => redirect('/login?error=confirmation'), 2000);
      }
    })();
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
