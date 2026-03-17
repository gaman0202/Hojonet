# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application built with TypeScript, React 19, and Tailwind CSS 4. The project uses the App Router architecture.

## Key Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
```

## Architecture

### Directory Structure
- `app/` - Next.js App Router: pages (`page.tsx`), layouts (`layout.tsx`), route handlers under `app/api/`
- `components/` - Shared UI (icons, layout, ui); feature-specific components live under `app/.../components/`
- `lib/` - Server/domain logic (e.g. `lib/expert/cases.ts`, `lib/auth.ts`)
- `utils/` - Supabase clients: `utils/supabase/client` (browser), `utils/supabaseAdmin` (API/server)
- `types/` - App-wide types; per-route types in `app/.../types.ts`
- `hooks/`, `store/` - Shared hooks and global state
- `public/` - Static assets (icons, images)
- **Detailed rules:** see `docs/PROJECT_STRUCTURE.md` for where to put new code and naming conventions.

### TypeScript Configuration
- Path alias `@/*` maps to project root
- Target: ES2017
- Module resolution: bundler (Next.js optimized)
- Strict mode enabled
- JSX compiled with `react-jsx` transform

### Styling
- Tailwind CSS 4 with PostCSS
- Dark mode support via `dark:` class variants
- Custom fonts: Geist Sans and Geist Mono (Google Fonts)

## Development Notes

### Next.js App Router
- Uses React Server Components by default
- Client components require `'use client'` directive
- Metadata exports for SEO (see `layout.tsx`)
- Auto-updates on file changes in development mode

### Linting
- ESLint configured with Next.js TypeScript rules
- Config ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
