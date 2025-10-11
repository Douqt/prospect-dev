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

  // Client-side onboarding check (backup for when middleware fails in production)
  useEffect(() => {
    // Skip if on auth routes
    const authRoutes = ['/login', '/signup', '/auth/check', '/auth/confirm', '/auth/onboarding'];
    const isOnAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isOnAuthRoute) {
      // No check needed on auth routes
      return;
    }

    // Always check (both dev and prod) - middleware might fail sometimes
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
          console.log('🚨 Client-side fallback: Redirecting to onboarding (no profile found)');
          router.push('/auth/onboarding');
          return;
        }

        // User has profile, continue normally
        console.log('✅ Client-side fallback: Profile check passed');
      } catch (error) {
        console.error('Client-side onboarding check error:', error);
      }
    };

    // Small delay to let middleware run first (if it works)
    const delay = process.env.NODE_ENV === 'production' ? 100 : 0;
    setTimeout(checkOnboarding, delay);
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
