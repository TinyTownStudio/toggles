# Agent Rules

- Say `I don't know` if there isn't enough evidence to support or help you with the output.
- Extract word-for-word quotes first before performing the task.
- Make responses auditable by citing quotes and sources for each of your claims. You can also verify each claim by finding a supporting quote after generating a response. If you can't find a quote, retract the claim.
- Explain your reasoning step-by-step before giving a final answer.
- Run through the same prompt multiple times and compare the outputs. Inconsistencies across outputs could indicate hallucinations.
- Use outputs as inputs for follow-up prompts, then verify or expand on previous statements. This can catch and correct inconsistencies.
- Only use information from provided documents and not your general knowledge.

## Project Overview

This is a **feature toggle management service** built with Deno. It provides a web UI and API for managing named boolean feature flags stored in SQLite.

## Tech Stack

- **Runtime:** Deno
- **Web framework:** Hono (`jsr:@hono/hono`)
- **Database:** SQLite via `deno.land/x/sqlite@v3.9.1`
- **UI:** Preact + `preact-render-to-string` with JSX via `@triptease/html-jsx`
- **Testing:** Deno's built-in test runner + `@std/assert`

## Running the Project

```bash
# Start the server (port 8000)
deno task start
# or directly:
deno run --allow-read --allow-write --allow-net src/index.ts

# Run tests
deno task test
```

## Architecture

```
src/
  index.ts           # Entry point — opens DB, starts Hono server on :8000
  app.tsx            # Hono app with route definitions
  db.ts              # DB helpers: openDb(), sql`` template tag, query()
  toggles.ts         # Business logic: listToggles, getToggle, createToggle, setEnabled
  web/
    pages/
      Home.tsx        # Preact component for the home page
  tests/
    health.test.ts   # Integration tests against the Hono app
```

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS toggles (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0
);
```

## Key Patterns

- **`sql` template tag** (`src/db.ts`): Builds parameterized `SqlQuery` objects. Use it for all queries to prevent SQL injection. Nested `SqlQuery` values are inlined safely. `undefined` interpolations throw.
- **`query<T>`** (`src/db.ts`): Executes a `SqlQuery` and returns typed row objects.
- **Toggle CRUD** (`src/toggles.ts`): All DB access goes through `toggles.ts` functions. `enabled` is stored as `0/1` integer and converted to `boolean` in the `toToggle` mapper.
- **JSX** uses `@triptease/html-jsx` as the `jsxImportSource` (configured in `deno.json`), not React or Preact directly.

## API Routes

| Method | Path      | Description                  |
|--------|-----------|------------------------------|
| GET    | `/`       | Renders the Home page (HTML) |
| GET    | `/health` | Returns `{ status, timestamp }` JSON |

## Testing

Tests live in `src/tests/` and use `app.request()` (no real network calls needed). Run with `deno task test`.
