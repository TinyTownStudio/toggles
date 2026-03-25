# Product Template

> This is a fork that builds on top of https://github.com/JoviDeCroock/product-template to make it a single vite based codebase instead of 2 different apps


A full-stack SaaS starter kit with authentication, billing, and a dashboard — ready to build on.

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | Preact, Vite, Tailwind CSS           |
| Backend    | Hono (Cloudflare Workers)            |
| Database   | Drizzle ORM + Cloudflare D1 (SQLite) |
| Auth       | BetterAuth (email/password)          |
| Billing    | Polar (free/pro plans, webhooks)     |

## Project Structure

```
├── src/          Preact frontend (Vite)
│   ├── components/   UI components
│   ├── pages/        Route pages (Home, Auth, Dashboard, Billing)
│   ├── models/       Signal-based models (auth, billing, subscription)
│       └── lib/          Auth client, API client, constants
├── api/          Hono backend (Cloudflare Workers)
│   ├── db/           Drizzle schema
│   ├── lib/          Auth setup, plan logic
│   ├── routes/       API routes
│   └── utils/        Helpers
└── package.json  Root
```

## Quick Start

```sh
pnpm i

pnpm dev # for dev

pnpm build # for building the assets
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A [Cloudflare](https://dash.cloudflare.com) account (free tier works)
- A [Polar](https://polar.sh) account (for billing)

### 1. Install dependencies

```sh
pnpm install
```

### 2. Set up environment files

Copy the example env files:

```sh
cp .dev.vars.example .dev.vars
cp .env.example .env
```

#### API environment (`.dev.vars`)

| Variable               | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Any random string — used to sign session tokens. Generate one with `openssl rand -hex 32`. |
| `BETTER_AUTH_URL`      | The API base URL. For local dev: `http://localhost:8787/api/auth`                          |
| `POLAR_ACCESS_TOKEN`   | Your Polar API access token (see Polar setup below).                                       |
| `POLAR_WEBHOOK_SECRET` | Webhook signing secret from Polar (see Polar setup below).                                 |
| `POLAR_PRO_PRODUCT_ID` | The Polar product ID for your "Pro" plan.                                                  |
| `LOCAL`                | Set to `true` for local development.                                                       |

#### Frontend environment (`.env`)

| Variable            | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | The API URL the frontend calls. For local dev: `http://localhost:8787` |

### 3. Set up Polar (billing)

1. Go to [polar.sh](https://polar.sh) and create an account.
2. Create an **Organization** (this represents your product/company).
3. Create a **Product** for your Pro plan:
   - Go to **Products** and click **Create Product**.
   - Set the name (e.g. "Pro"), price ($10/mo), and billing interval.
   - After creating, copy the **Product ID** from the product page — this is your `POLAR_PRO_PRODUCT_ID`.
4. Get your **Access Token**:
   - Go to **Settings > Developers > Personal Access Tokens**.
   - Create a new token with the necessary scopes.
   - Copy it — this is your `POLAR_ACCESS_TOKEN`.
5. Set up a **Webhook** (needed for subscription lifecycle events):
   - Go to **Settings > Webhooks** and click **Add Endpoint**.
   - URL: `https://your-api-domain.com/api/auth/polar/webhook` (for production). For local dev, use [Polar's local webhook guide](https://docs.polar.sh/integrate/webhooks/locally).
   - Select events: `subscription.updated`, `subscription.active`, `subscription.canceled`, `subscription.revoked`, `customer.created`.
   - After creating, copy the **Signing Secret** — this is your `POLAR_WEBHOOK_SECRET`.

> For local development, Polar uses a **sandbox** environment automatically (the template detects `LOCAL=true`). No real payments are processed.

### 4. Set up the database

Generate the schema and run migrations against the local D1 database:

```sh
pnpm run db:generate
pnpm run db:migrate:local
```

### 5. Run locally

Just start vite, it'll start both the api and web servers for you

```sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment

### Cloudflare Setup

1. **Install Wrangler** (already in devDependencies, or install globally with `npm i -g wrangler`).
2. **Log in**: `wrangler login`
3. **Create a D1 database**:

   ```sh
   wrangler d1 create app-db
   ```

   Copy the output `database_id` and paste it into `api/wrangler.jsonc` (replacing the placeholder `00000000-...`).

4. **Run migrations on the remote database**:

   ```sh
   cd api && pnpm run db:migrate:remote
   ```

5. **Set secrets** in Cloudflare (these are the same values from your `.dev.vars`, but for production):

   ```sh
   cd api
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put POLAR_ACCESS_TOKEN
   wrangler secret put POLAR_WEBHOOK_SECRET
   wrangler secret put POLAR_PRO_PRODUCT_ID
   ```

   Each command will prompt you to paste the value.

6. **Update production URLs** in `api/wrangler.jsonc`:
   - Set `BETTER_AUTH_URL` to your production API URL (e.g. `https://api.yourdomain.com`).

7. **Update CORS and redirect URLs** in `api/index.ts` and `api/lib/auth.ts`:
   - Replace `app.example.com` and `api.example.com` with your actual domains.

### Deploy 

```sh
pnpm run build
pnpm run deploy
```

## Lint & Format

```sh
pnpm -w run lint         # oxlint with auto-fix
pnpm -w run format       # oxfmt write
pnpm -w run check        # lint + format check (CI)
```
