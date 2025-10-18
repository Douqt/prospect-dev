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

/**
 * Theme preference type
 */
export type Theme = 'light' | 'dark';

/**
 * Props for the Providers component
 */
export interface ProvidersProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Initial theme from server-side rendering */
  initialTheme?: Theme | null;
}

/**
 * Root providers component that wraps the entire application
 * Provides React Query, theme, tooltips, and authentication state management
 * Includes client-side onboarding validation as a fallback to middleware
 */
export default function Providers({ children, initialTheme }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      },
    },
  }));
  const router = useRouter();
  const pathname = usePathname();

  // Client-side onboarding check (backup for when middleware fails in production)
  useEffect(() => {
    // Skip if on auth routes
    const authRoutes = ['/login', '/signup', '/auth/check', '/auth/confirm', '/auth/onboarding'];
    const isOnAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isOnAuthRoute) {
      return; // No check needed on auth routes
    }

    /**
     * Validates user authentication and profile completion
     * Redirects to onboarding if profile is missing
     */
    const checkOnboarding = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return; // Not authenticated, continue normally
        }

        // User is authenticated, check if they have a profile
        const hasProfile = await userHasProfile(user.id);

        if (!hasProfile) {
          router.push('/auth/onboarding');
          return;
        }
      } catch (error) {
        // Silently handle errors - this is a fallback check
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
