import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}", 
    "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        prospect: {
          gold: "hsl(var(--prospect-gold))",
          "gold-light": "hsl(var(--prospect-gold-light))",
          "gold-dark": "hsl(var(--prospect-gold-dark))",
          "baby-blue": "hsl(var(--prospect-baby-blue))",
          "baby-blue-light": "hsl(var(--prospect-baby-blue-light))",
          "baby-blue-dark": "hsl(var(--prospect-baby-blue-dark))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        babyBlueCycle: {
          "0%": { color: "rgb(56, 189, 248)" },  // sky-400
          "25%": { color: "rgb(125, 211, 252)" }, // sky-300
          "50%": { color: "rgb(14, 165, 233)" }, // sky-500
          "75%": { color: "rgb(125, 211, 252)" }, // sky-300
          "100%": { color: "rgb(56, 189, 248)" }, // sky-400
        },
        goldCycle: {
          "0%": { color: "rgb(252, 211, 77)" },  // yellow
          "25%": { color: "rgb(224, 168, 21)" }, // gold
          "50%": { color: "rgb(251, 146, 60)" }, // orange
          "75%": { color: "rgb(224, 168, 21)" }, // gold
          "100%": { color: "rgb(252, 211, 77)" }, // yellow
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "baby-blue-cycle": "babyBlueCycle 4s linear infinite",
        "gold-cycle": "goldCycle 4s linear infinite",
      },
      
    },
  },
  plugins: [animatePlugin],
} satisfies Config;

// Dark mode configuration
// Add to your middleware or layout to set js.cookie with user's theme preference
// This snippet enables zero-flash dark mode
// Usage: Store "light" or "dark" in document.cookie "theme"
// or use localStorage "theme" as fallback in head script
