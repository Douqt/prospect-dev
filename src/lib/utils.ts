import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the correct base URL for the current environment
 */
export function getBaseUrl() {
  // In production (Vercel), use the production URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://prospect-dev.vercel.app'
  }

  // In development, use localhost with current port (or 3000 as fallback)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side development fallback
  return 'http://localhost:3000'
}
