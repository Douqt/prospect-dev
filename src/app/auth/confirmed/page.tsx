"use client";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  useEffect(() => {
    // token is already consumed by Supabase, just wait for session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user needs onboarding
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

            // Try to communicate with parent/original tab to redirect them
            if (window.opener) {
              // This is a popup - tell the parent to navigate to onboarding
              window.opener.postMessage({ type: 'EMAIL_CONFIRMED_NEEDS_ONBOARDING' }, '*');
              // Close this popup after a short delay
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              // Not a popup, redirect directly
              setTimeout(() => {
                redirect('/auth/onboarding');
              }, 1500);
            }
          } else {
            // User is already onboarded, go home
            setStatus('success');
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'EMAIL_CONFIRMED_FINISHED' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                redirect('/');
              }
            }, 1500);
          }
        } catch (error) {
          console.error('Profile check error:', error);
          setStatus('failed');
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              redirect('/login?error=confirmation_failed');
            }
          }, 2000);
        }
      } else {
        setStatus('failed');
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            redirect('/login?error=confirmation_failed');
          }
        }, 2000);
      }
    });
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
              Please wait while we verify your email address...
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
              Your email has been confirmed. {window.opener ? 'This window will close and return you to the onboarding process.' : 'Taking you to onboarding...'}
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
              {window.opener ? 'This window will close and return you to the app.' : 'Taking you to the app...'}
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
              There was an issue confirming your email. Please try again or contact support.
              {window.opener ? ' This window will close shortly.' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
