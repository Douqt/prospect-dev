Prospect (next_react_shadcn_ts) — Project Documentation

This document explains the purpose, structure, setup, and development workflow for the Prospect project (a React + shadcn UI app migrated to Next.js App Router).

## Table of contents

- Project overview
- Tech stack
- Quick start
- Environment variables
- Scripts
- Project structure (key files)
- Important implementation details
  - Providers and root layout
  - Waitlist form & Supabase
  - Toast system & Sonner fallback
  - Client vs Server components
- Migration notes (Vite → Next.js)
- Troubleshooting (common errors & fixes)
- Testing, linting, and quality gates
- Deployment
- Contributing & next steps

---

## Project overview

Prospect is a marketing/landing front-end built with Next.js (App Router), TypeScript, Tailwind CSS and shadcn-ui. It provides a hero, features section, and a waitlist signup backed by Supabase.

This repository was migrated from a Vite React project into a Next.js App Router structure. The `app/` directory contains the primary routes and layout.

## Tech stack

- Next.js (App Router)
- React 18
- TypeScript
- Tailwind CSS (+ tailwind-merge, tailwind-animate)
- shadcn-ui (Radix + custom components)
- @tanstack/react-query
- sonner (toast UI)
- @supabase/supabase-js (Supabase client)
- lucide-react (icons)

## Quick start

Prerequisites:
- Node.js (LTS recommended)
- npm (or pnpm/yarn if you prefer)

1. Install dependencies

```powershell
# from repository root
npm install
# Prospect (next_react_shadcn_ts) — Project Documentation

This document explains the purpose, structure, setup, and development workflow for the Prospect project (a React + shadcn UI app migrated to Next.js App Router).

## Table of contents

- Project overview
- Tech stack
- Quick start
- Environment variables
- Scripts
- Project structure (key files)
- Important implementation details
  - Providers and root layout
  - Waitlist form & Supabase
  - Toast system & Sonner fallback
  - Client vs Server components
- Migration notes (Vite → Next.js)
- Troubleshooting (common errors & fixes)
- Testing, linting and quality gates
- Deployment
- File-by-file reference
- Contributing & next steps

---

## Project overview

Prospect is a marketing/landing front-end built with Next.js (App Router), TypeScript, Tailwind CSS and shadcn-ui. It provides a hero, features section, and a waitlist signup backed by Supabase.

This repository was migrated from a Vite React project into a Next.js App Router structure. The `app/` directory contains the primary routes and layout.

## Tech stack

- Next.js (App Router)
- React 18
- TypeScript
- Tailwind CSS (+ tailwind-merge, tailwind-animate)
- shadcn-ui (Radix + custom components)
- @tanstack/react-query
- sonner (toast UI)
- @supabase/supabase-js (Supabase client)
- lucide-react (icons)

## Quick start

Prerequisites:
- Node.js (LTS recommended)
- npm (or pnpm/yarn if you prefer)

1. Install dependencies

```powershell
# from repository root
npm install
```

2. Create environment variables

See the Environment variables section for required keys and an example `.env.local`.

3. Start dev server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment variables

The app expects Supabase environment variables for the waitlist feature.

Create a `.env.local` at the repository root with the following values:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Node/Next runtime environment
NODE_ENV=development
PORT=3000
```

Important: Do not commit `.env.local` to version control.

## Scripts (package.json)

- `npm run dev` — start Next.js in development on port 3000
- `npm run build` — build the app for production
- `npm run start` — start the production server (after build)
- `npm run export` — run `next export` (static export)
- `npm run lint` — run ESLint

## Project structure (key files)

Top-level
- `package.json` — project manifest and scripts
- `tsconfig.json` — TypeScript config (root)
- `DOCS.md` — (this file)

src/
- `app/` — Next.js App Router folder
  - `layout.tsx` — root layout; wraps pages with `Providers`
  - `page.tsx` — home page (hero, features, CTA)
  - `not-found.tsx` — 404 page (client component)
- `components/` — presentational and re-usable components
  - `FeatureCard.tsx` — small card for listing features
  - `WaitlistForm.tsx` — client component with `useState`, posts to Supabase
  - `ui/` — shadcn-ui adapted components (button, input, toaster, sonner wrapper, etc.)
- `hooks/`
  - `use-toast.ts` — app-specific toast + in-memory toast manager
- `lib/`
  - `supabaseClient.ts` — Supabase client using `NEXT_PUBLIC_*` env vars
- `assets/` — images and static assets (e.g., `prospect-logo.png`)

## Important implementation details

### Providers and root layout

- `src/app/providers.tsx` is a client component (has `"use client"`) that sets up:
  - React Query `QueryClientProvider`
  - `TooltipProvider` (from UI library)
  - `Toaster` (custom Sonner wrapper) and `Toaster` (shadcn UI)

- `src/app/layout.tsx` imports `Providers` and wraps the entire app. Keep heavy client-only libraries inside the provider to avoid making whole pages clients unnecessarily.

### Waitlist form & Supabase

- `src/components/WaitlistForm.tsx` is a client component. It uses `useState` and `useToast`, and writes a row into the `waitlist` table in Supabase via the shared `supabase` client exported from `src/lib/supabaseClient.ts`.

- The Supabase client reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables.

### Toast system & Sonner fallback

- The project includes a custom toast manager in `src/hooks/use-toast.ts` (an in-memory reducer + listener system). It provides `useToast()` and `toast()` helpers.

- `src/components/ui/sonner.tsx` is a small wrapper around `sonner`'s `<Toaster />` with a `useThemeFallback()` hook that inspects `document.documentElement` for a `data-theme` attribute or falls back to system `prefers-color-scheme`. This was introduced to avoid an external `next-themes` dependency and to keep the UI consistent.

### Client vs Server components

- Next.js App Router differentiates Server Components (default) from Client Components (must include `"use client"` at file top).

- Any component that uses React hooks such as `useState`, `useEffect`, `useRef` or browser APIs must be a Client Component.

- Common fixes:
  - If you see the error: `You're importing a component that needs useState. This React Hook only works in a Client Component. To fix, mark the file (or its parent) with the "use client" directive.` — add `"use client";` as the first line of that component file.
  - Prefer marking leaf components as clients instead of marking entire pages unless necessary.

## Migration notes (Vite → Next.js)

Key changes made during migration:
- Removed Vite entry points (`index.html`, `src/main.tsx`, `src/App.tsx`).
- Kept and adapted the existing `app/` directory to Next.js App Router conventions.
- Fixed TypeScript project references in the root `tsconfig.json` (removed cross-project `references` that caused composite errors for this simple repo layout).
- Replaced direct usage of imported image StaticImageData with `image.src` where TypeScript expected a string (e.g., `prospectLogo.src`).
- Resolved a failing dependency attempt to install `next-themes@^1.2.0` by implementing a local theme fallback in `src/components/ui/sonner.tsx`.

## Troubleshooting (common errors & fixes)

- Hooks in Server Components
  - Error: `You're importing a component that needs useState...` — Solution: Add `"use client"` to the top of the component file.

- StaticImageData / Image src type errors
  - If TypeScript complains about using imported images directly in `img` `src`, use the `prospectLogo.src` property (when you import PNG files via Vite/Next image imports as static metadata). Alternatively use Next.js `Image` component.

- Missing dependency (next-themes ETARGET)
  - If `npm install` fails for a package version that doesn't exist, remove/rollback the dependency and provide a small local fallback (this repository uses `useThemeFallback()` to avoid `next-themes`).

## Testing, linting, and quality gates

- Linting: use `npm run lint` to run ESLint across the project. The project ships with an ESLint + TypeScript config. Fix lint errors before committing.
- Type-check: run `npx tsc --noEmit` if you want a dedicated TypeScript-only check.

Quality gate suggestions:
- Build locally with `npm run build` to catch production-only errors.
- Run `npm run lint` and `npx tsc --noEmit` as part of CI.

## Deployment

Recommended options:
- Vercel: Next.js is supported out of the box — create a new Vercel project, point to this repo, and set the environment variables (Supabase keys) in the Vercel dashboard.
- Netlify: supported but may require additional settings for Next.js App Router features.

For a basic static export (if your app does not rely on SSR or dynamic routes):

```powershell
npm run build
npm run export
```

