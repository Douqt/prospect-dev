"use client";

import { createContext, useContext } from 'react';

/**
 * Theme type definition for light and dark modes
 */
export type Theme = 'light' | 'dark';

/**
 * Interface for the theme context providing theme state and controls
 */
export interface ThemeContextType {
  /** Current theme mode */
  theme: Theme;
  /** Function to toggle between light and dark themes */
  toggleTheme: () => void;
  /** Loading state for theme operations */
  isLoading?: boolean;
}

/**
 * React context for theme management
 * Provides theme state and toggle functionality throughout the app
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Custom hook to access the theme context
 * Must be used within a ThemeProvider component
 * @returns Theme context with current theme and toggle function
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
