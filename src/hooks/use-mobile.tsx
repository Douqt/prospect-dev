import * as React from "react";

/**
 * Custom hook to detect if the current screen size is mobile
 * Uses 768px as the breakpoint for mobile devices
 * @returns boolean indicating if the screen is mobile size
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const MOBILE_BREAKPOINT = 768;

    const checkIsMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

    // Set initial state
    setIsMobile(checkIsMobile());

    // Create media query for responsive detection
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
