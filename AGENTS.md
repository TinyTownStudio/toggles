# AGENTS.md

Guidance for agentic coding assistants operating in this repository.

## Repository Layout

```
/
├── packages/
│   ├── app/          # Main application (frontend + backend)
│   │   ├── api/      # Hono backend (Cloudflare Worker)
│   │   └── src/      # Preact frontend
│   └── sdks/         # Placeholder (empty)
```

All substantive work happens inside `packages/app/`. The root workspace only
manages husky and pnpm workspaces.

## Build, Lint, Test Commands

Run from `packages/app/` unless noted otherwise.

```bash
pnpm dev                    # Start dev server (Vite + Cloudflare Worker)
pnpm build                  # Type-check + production build (tsc -b && vite build)
pnpm deploy                 # Deploy to Cloudflare (wrangler deploy --minify)

pnpm lint                   # Run oxlint with auto-fix
pnpm format                 # Format all files with oxfmt
pnpm format:check           # Check formatting without writing
pnpm check                  # Lint + format check (used in CI)

pnpm test                   # Run all tests (vitest run)
```

### Running a Single Test

Tests run inside the Cloudflare Workers Miniflare runtime via
`@cloudflare/vitest-pool-workers`. Vitest CLI flags work normally:

```bash
# Run a single test file
pnpm vitest run api/tests/apiKeys.test.ts

# Run tests matching a name pattern
pnpm vitest run --reporter=verbose -t "should create an API key"

# Watch mode during development
pnpm vitest api/tests/apiKeys.test.ts
```

### Database Commands

```bash
pnpm db:generate            # Generate migrations from schema changes
pnpm db:migrate:local       # Apply migrations to local D1
pnpm db:migrate:remote      # Apply migrations to production D1
pnpm db:studio              # Open Drizzle Studio
```

## Architecture Overview

Full-stack SaaS running entirely on Cloudflare:

- **Frontend:** Preact + Vite (rolldown-vite) + Tailwind CSS v4, served as SPA
- **Backend:** Hono on Cloudflare Workers (`api/`)
- **Database:** Drizzle ORM + Cloudflare D1 (SQLite)
- **Auth:** BetterAuth (email/password + API keys)
- **Billing:** Polar (free/pro plans via webhooks)

The Cloudflare Vite plugin combines the frontend and Worker into a single
deployment. Worker handles `/api/*` first; everything else serves the SPA.

## Code Style

### TypeScript

- **Strict mode** is enabled. All `tsconfig*.json` files use `strict: true`.
- `verbatimModuleSyntax: true` is set — **always** use `import type` for
  type-only imports:
  ```ts
  import type { JSX } from "preact";
  import type { Bindings } from "./types";
  ```
- `erasableSyntaxOnly: true` — **no `enum`**, **no `namespace`**, no parameter
  decorators. Only type-level constructs that are erased at compile time.
- `noUnusedLocals` and `noUnusedParameters` are enabled. Remove unused
  variables and parameters; don't suppress with `_` prefixes unless necessary.

### `interface` vs `type`

- Use `interface` for object shapes representing data entities, API responses,
  and component props:
  ```ts
  export interface Toggle { id: string; key: string; enabled: boolean; }
  interface AuthFormProps { onSuccess?: () => void; compact?: boolean; }
  ```
- Use `type` for unions, string literal unions, and simple aliases:
  ```ts
  type Plan = "free" | "pro";
  type ThemePreference = "light" | "dark" | "system";
  type ButtonVariant = "primary" | "secondary" | "ghost";
  ```

### Imports

- All imports within the monorepo are **relative** — no `@/` or `~/` path
  aliases are configured.
- Use the `node:` protocol for Node built-ins: `import path from "node:path"`.
- Group third-party imports before local imports (no enforced tool, but follow
  the existing convention).

### Naming Conventions

- **Files/folders:** `camelCase` for utility files (`api.ts`, `plans.ts`),
  `PascalCase` for component files (`Button.tsx`, `AuthForm.tsx`) and page
  folders (`Home/`, `ProjectDetail/`).
- **Models:** Named `*Model` suffix — exported as a `createModel()` factory
  call returning signals and actions.
- **Components:** PascalCase. Variant logic lives in a `variantClasses` record
  keyed by the variant string union.
- **Backend routes:** Grouped by resource in `api/routes/*.ts`, mounted via
  `app.route()` in `api/index.ts`.

### Formatting

- Formatter: **oxfmt** (no config file — defaults apply).
- Linter: **oxlint** (no config file — `--fix` is applied on lint).
- Pre-commit hook (`nano-staged`) auto-runs `oxfmt --write` on staged
  `*.{js,ts,tsx,jsx,json}` files. Do not skip hooks.
- Do not introduce Prettier, Biome, or ESLint config files — those packages
  exist in devDependencies but are not actively used.

## Frontend Patterns (`src/`)

### State Management

State lives in `src/models/` using **Preact Signals**. Each model follows the
`createModel()` pattern:

```ts
import { signal, computed } from "@preact/signals";

export const SomeModel = () => {
  const loading = signal(false);
  const data = signal<Item[]>([]);
  const error = signal<string | null>(null);

  const fetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await someApiCall();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
    } finally {
      loading.value = false;
    }
  };

  return { loading, data, error, fetch };
};
```

- Every async model action uses `loading`/`error`/`finally` — never leave
  `loading` stuck on error.
- **Optimistic updates:** snapshot previous state, apply immediately, rollback
  on failure:
  ```ts
  const prev = items.value;
  items.value = prev.filter(i => i.id !== id);
  try {
    await deleteItem(id);
  } catch (err) {
    items.value = prev;
    error.value = err instanceof Error ? err.message : "Delete failed";
  }
  ```

### API Calls (`src/lib/api.ts`)

All API calls go through the generic `fetchApi<T>` wrapper:

```ts
export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T>
```

- Each resource has individually exported async functions (e.g.,
  `getToggles`, `createToggle`, `deleteToggle`).
- Add explicit return type annotations to exported API functions.
- `fetchApi` throws `Error` with the server's `error` field or
  `HTTP {status}` as fallback — catch these in model functions.

### Components

- Prefer Tailwind utility classes; design tokens are in `src/style.css`.
- UI primitives live in `src/components/ui/` (`Button`, `Input`, `Alert`).
- Spread `JSX.IntrinsicElements["button"]` (or equivalent) in primitives to
  support all native attributes without manual prop threading.
- Avoid `useState` in favor of signals for cross-component state; `useState`
  is acceptable for purely local, ephemeral UI state (e.g., open/close).

## Backend Patterns (`api/`)

### Route Structure

```ts
// api/index.ts — mount routes
import { projectsRouter } from "./routes/projects";
app.route("/api/v1/projects", projectsRouter);
```

Each route file exports a `Hono<{ Bindings: Bindings; Variables: Variables }>`
instance. Import `Bindings` and `Variables` from `./types`.

### Auth Guards

Session middleware populates `c.get("user")`. Guard every protected endpoint:

```ts
const userId = c.get("user")?.id;
if (!userId) return c.json({ error: "Unauthorized" }, 401);
```

### Error Responses

Always return `{ error: "..." }` JSON with the appropriate status:

```ts
return c.json({ error: "Not found" }, 404);
return c.json({ error: "Forbidden" }, 403);
return c.json({ error: "Internal Server Error" }, 500);
```

### Database (Drizzle + D1)

- Schema is in `api/db/schema.ts`. Use `sqliteTable` with `drizzle-orm/sqlite-core`.
- Booleans: `integer({ mode: "boolean" })`.
- Timestamps: `integer({ mode: "timestamp" })` (stored as Unix epoch, mapped to `Date`).
- JSON columns: `text({ mode: "json" })`.
- Always add foreign keys with `{ onDelete: "cascade" }` where appropriate.
- After schema changes, run `pnpm db:generate` then `pnpm db:migrate:local`.

## Testing

Tests are in `api/tests/` and run inside the Cloudflare Workers Miniflare
runtime — standard Node.js APIs may not be available.

- Use `SELF` from `cloudflare:test` for in-process HTTP calls.
- Apply D1 migrations in `beforeAll` using the `TEST_MIGRATIONS` binding.
- Use helpers from `api/tests/helpers.ts` (`signUp`, `signIn`, `apiGet`, etc.)
  rather than duplicating fetch logic.
- Test files use `.test.ts` suffix.
- Assert HTTP status codes explicitly on every response; don't assume success.

## Environment

Copy `.env.example` → `.env` and `.dev.vars.example` → `.dev.vars` before
running locally. Required secrets for `.dev.vars`:

```
BETTER_AUTH_SECRET=
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRO_PRODUCT_ID=
```

Never commit `.env`, `.dev.vars`, or any file containing secrets.
