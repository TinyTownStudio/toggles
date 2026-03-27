# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (Vite + Cloudflare Worker)
pnpm build            # Build for production
pnpm deploy           # Deploy to Cloudflare (wrangler deploy --minify)
pnpm run lint         # Run oxlint with auto-fix
pnpm run format       # Format with oxfmt
pnpm run check        # Full lint + format check (for CI)
```

**Database:**

```bash
pnpm run db:generate        # Generate migrations from schema changes
pnpm run db:migrate:local   # Apply migrations to local D1
pnpm run db:migrate:remote  # Apply migrations to production D1
pnpm run db:studio          # Open Drizzle Studio
```

## Architecture

Full-stack SaaS app running entirely on Cloudflare infrastructure:

- **Frontend:** Preact + Vite + Tailwind CSS v4, served as SPA
- **Backend:** Hono on Cloudflare Workers (`api/`)
- **Database:** Drizzle ORM + Cloudflare D1 (SQLite)
- **Auth:** BetterAuth with email/password
- **Billing:** Polar (free/pro plans via webhooks)

The Vite build (`vite.config.ts`) combines frontend and API into a single deployment using `@cloudflare/vite-plugin`. The worker handles `/api/*` routes first; everything else serves the SPA.

### Frontend (`src/`)

State is managed via **Preact Signals** in `src/models/`:

- `auth` — session and user state
- `billing` — subscription plan and limits
- `notes` — local-only example model
- `theme` — light/dark toggle

Pages live in `src/pages/`, components in `src/components/`. API calls go through `src/lib/api.ts` which wraps `fetch` with the base URL from `VITE_API_BASE_URL`.

### Backend (`api/`)

`api/index.ts` is the Hono entry point. It sets up CORS (locked to localhost:5173 in dev, configurable for prod), security headers, and mounts routes:

- `GET /api/auth/*` — BetterAuth handler
- `GET /api/v1/me` — current user (session-protected)
- `GET /api/v1/subscription` — plan + limits (session-protected)
- `GET /api/billing-success` — Polar checkout completion redirect
- BetterAuth also exposes checkout and customer portal endpoints via Polar plugins

Session middleware for `/api/v1/*` is in `api/index.ts` and validates via BetterAuth.

### Database schema (`api/db/schema.ts`)

Tables: `user`, `session`, `account`, `verification` (all BetterAuth standard), plus `subscription` (plan, status, Polar IDs, period end dates).

### Plans (`api/lib/plans.ts`)

Defines per-plan limits (e.g., note count). `getUserPlan` reads subscription status from D1 to return the active plan for a user.

## Environment Setup

Copy `.env.example` → `.env` and `.dev.vars.example` → `.dev.vars` before running locally. The API needs `BETTER_AUTH_SECRET`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and `POLAR_PRO_PRODUCT_ID`.
