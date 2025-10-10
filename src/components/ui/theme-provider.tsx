"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ThemeContext } from '@/hooks/useTheme';

type Theme = 'light' | 'dark';

// Hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper to get initial theme on client-side
async function getClientInitialTheme(): Promise<Theme> {
  if (typeof window === 'undefined') return 'light';

  // Check localStorage first
  const stored = localStorage.getItem('theme') as Theme;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  // Check if user is logged in
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // If user is NOT logged in, default to dark mode
    if (!user) {
      return 'dark';
    }
  } catch (error) {
    // If there's an error checking auth, default to dark
    console.debug('Auth check error during theme init:', error);
    return 'dark';
  }

  // Fallback to system preference for logged in users
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  initialTheme
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() =>
    initialTheme || 'dark' // Default to dark while loading
  );
  const [isLoading, setIsLoading] = useState(false);

  // Initialize theme asynchronously on mount
  useEffect(() => {
    if (initialTheme) return; // Already have initial theme from SSR

    getClientInitialTheme().then((resolvedTheme) => {
      setTheme(resolvedTheme);
    }).catch(() => {
      setTheme('dark'); // Fallback to dark on error
    });
  }, [initialTheme]);

  // Update DOM immediately when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Store in localStorage immediately
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Debounced DB save - wait 500ms after last change
  const debouncedTheme = useDebounce(theme, 500);

  useEffect(() => {
    const saveToDatabase = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({ dark_mode: debouncedTheme === 'dark' })
            .eq('id', user.id);

          if (error) {
            console.error('Failed to save theme preference:', error);
          }
        }
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    saveToDatabase();
  }, [debouncedTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isLoading
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
