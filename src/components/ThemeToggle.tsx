"use client";

import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  onChange?: (darkMode: boolean) => void;
}

export function ThemeToggle({ onChange }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    toggleTheme();
    onChange?.(theme === 'light');
  };

  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">
        {isDark ? "Dark Theme" : "Light Theme"}
      </span>
      <button
        onClick={handleToggle}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
