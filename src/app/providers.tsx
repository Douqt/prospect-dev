"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { supabase } from "@/lib/supabaseClient";
import { userHasProfile } from "@/lib/profile";

type Theme = 'light' | 'dark';

interface ProvidersProps {
  children: React.ReactNode;
  initialTheme?: Theme | null;
}

export default function Providers({ children, initialTheme }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const router = useRouter();
  const pathname = usePathname();

  // Client-side onboarding check (works in development when middleware doesn't)
  useEffect(() => {
    // Skip if on auth routes or if in production (let middleware handle it)
    const authRoutes = ['/login', '/signup', '/auth/check', '/auth/confirm', '/auth/onboarding'];
    const isOnAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isOnAuthRoute || process.env.NODE_ENV === 'production') {
      // In production, middleware handles this. In dev on auth routes, no check needed
      return;
    }

    // Check auth and profile status
    const checkOnboarding = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
          // Not authenticated, continue normally
          return;
        }

        // User is authenticated, check if they have a profile
        const hasProfile = await userHasProfile(user.id);

        if (!hasProfile) {
          console.log('🚨 Client-side: Redirecting to onboarding (no profile)');
          router.push('/auth/onboarding');
          return;
        }

        // User has profile, continue normally
        console.log('✅ Client-side: Profile check passed');
      } catch (error) {
        console.error('Client-side onboarding check error:', error);
      }
    };

    checkOnboarding();
  }, [pathname, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialTheme={initialTheme || undefined}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
