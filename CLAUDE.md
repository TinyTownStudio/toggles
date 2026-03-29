# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (Vite on port 5173)
pnpm build            # Build for production (client + server)
pnpm build:check      # Build with TypeScript checking
pnpm run lint         # Run oxlint with auto-fix
pnpm run format       # Format with oxfmt
pnpm run check        # Full lint + format check (for CI)
```

**Production Server:**

```bash
NODE_ENV=production node dist/server/index.js  # Run production server on port 3000
```

**Database:**

```bash
pnpm run db:generate        # Generate migrations from schema changes
pnpm run db:migrate:local   # Apply migrations to local D1
pnpm run db:migrate:remote  # Apply migrations to production D1
pnpm run db:studio          # Open Drizzle Studio
```

## Architecture

Full-stack SaaS application:

- **Frontend:** Preact + Vite + Tailwind CSS v4, served as SPA
- **Backend:** Fastify on Node.js (`api/`)
- **Database:** Drizzle ORM + Cloudflare D1 (SQLite)
- **Auth:** BetterAuth with email/password
- **Billing:** Polar (free/pro plans via webhooks)

The Vite build (`vite.config.ts`) creates two outputs:
1. `dist/client/` - Frontend SPA assets
2. `dist/server/` - Fastify Node.js server

The server handles `/api/*` routes and serves the SPA for all other routes.

### Frontend (`src/`)

State is managed via **Preact Signals** in `src/models/`:

- `auth` — session and user state
- `billing` — subscription plan and limits
- `notes` — local-only example model
- `theme` — light/dark toggle

Pages live in `src/pages/`, components in `src/components/`. API calls go through `src/lib/api.ts` which wraps `fetch` with the base URL from `VITE_API_BASE_URL`.

### Backend (`api/`)

`api/index.ts` is the Fastify entry point. It sets up:
- **CORS** - Configured for localhost:5173 in dev, app.example.com in prod
- **Security Headers** - Via `onSend` hook (HSTS, X-Frame-Options, CSP, etc.)
- **Session Auth** - Via `preHandler` hook for `/api/v1/*` routes
- **Decorators** - `fastify.env`, `fastify.db`, `fastify.auth` for shared state

**Routes:**
- `ALL /api/auth/*` — BetterAuth handler (converted to Fastify)
- `GET /api/v1/me` — Current user (session-protected)
- `GET /api/v1/subscription` — Plan + limits (session-protected)
- `GET /api/v1/projects` — Projects CRUD (session-protected)
- `GET /api/v1/projects/:id/toggles` — Toggles CRUD (session-protected)
- `GET /api/billing-success` — Polar checkout completion redirect

Session validation is done in the `preHandler` hook and sets `request.user` and `request.session`.

### Database schema (`api/db/schema.ts`)

Tables: `user`, `session`, `account`, `verification` (all BetterAuth standard), plus `subscription` (plan, status, Polar IDs, period end dates).

### Plans (`api/lib/plans.ts`)

Defines per-plan limits (e.g., note count). `getUserPlan` reads subscription status from D1 to return the active plan for a user.

## Environment Setup

Copy `.env.example` → `.env` before running locally. The API needs:
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_PRO_PRODUCT_ID`
- `DB` - Database connection
- `LOCAL` - Set to "true" for local development

## Migration Notes

**2026-03-29:** Migrated API from Hono to Fastify.

**Key Changes:**
- Framework: Hono → Fastify
- Pattern: `c.json()` → `reply.send()`
- Context: `c.get('user')` → `request.user`
- Middleware: `app.use()` → `addHook()`
- Bindings: `c.env.DB` → `fastify.db` (decorators)

See `MIGRATION_COMPLETE.md` for full details.
