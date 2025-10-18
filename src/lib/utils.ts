import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge for optimal CSS class handling
 * Removes duplicate classes and handles conditional classes properly
 * @param inputs - Variable number of class values (strings, conditionals, objects, arrays)
 * @returns Merged and deduplicated class string
 * @example
 * cn("px-2", isActive && "bg-blue-500", { "text-red": hasError })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Gets the correct base URL for the current environment
 * Handles different environments (development, production, server-side)
 * @returns Base URL string for the current environment
 */
export function getBaseUrl(): string {
  // In production (Vercel), use the production URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://prospect-dev.vercel.app';
  }

  // In development, use localhost with current port (or 3000 as fallback)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side development fallback
  return 'http://localhost:3000';
}
