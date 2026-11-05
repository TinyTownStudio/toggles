import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { iterListSubscriptions } from "@polar-sh/sdk/2026-10/services/subscriptions";
import { createAuth } from "./lib/auth";
import { subscription } from "./routes/subscription";
import { projects } from "./routes/projects";
import { apiKeys } from "./routes/apiKeys";
import { dashboard } from "./routes/dashboard";
import { portal } from "./routes/portal";
import { organizations } from "./routes/organizations";
import type { Bindings, Variables } from "./types";
import { billingSuccessRedirect, getAppOrigin } from "./lib/appOrigin";
import { createPolarClient } from "./lib/polarClient";
import * as schema from "./db/schema";
import { env } from "hono/adapter";

const app = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// Security response headers
app.use("/api/*", async (c, next) => {
  const { DATABASE_URL } = env(c);
  const dbConnection: D1Database | string = c.env.DB ?? DATABASE_URL;

  let connection: any;
  if (c.env.DB) {
    const d1Drizzle = await import("drizzle-orm/d1");
    connection = d1Drizzle.drizzle(dbConnection, { schema });
  } else if (typeof dbConnection === "string") {
    const bsql = await import("drizzle-orm/better-sqlite3");
    connection = bsql.drizzle(dbConnection, { schema });
  }

  c.set("db", connection);

  await next();

  if ("close" in connection.$client && typeof connection.$client.close === "function") {
    connection.$client.close();
  }

  c.res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
});

// CORS - allow the frontend origin and credentials (cookies)
app.use(
  "/api/*",
  cors({
    origin: (_origin, c) => getAppOrigin(c.env),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.get("/api/billing-success", async (c) => {
  // Require an authenticated session - only the paying user should trigger their own upgrade.
  const auth = createAuth(c.env, c.get("db"));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");

  const checkoutId = c.req.query("checkout_id");
  if (!checkoutId) {
    return c.json({ error: "Missing checkout_id parameter" }, 400);
  }

  const polarClient = createPolarClient(c.env);

  const checkout = await getCheckouts(polarClient)(checkoutId);

  if (!checkout?.customer_id) {
    return c.json({ error: "Invalid checkout session" }, 400);
  }

  // Verify that this checkout belongs to the authenticated user.
  // external_customer_id is set by BetterAuth's Polar plugin to the user's ID.
  if (!checkout.external_customer_id) {
    return c.json({ error: "Checkout has no associated user" }, 400);
  }
  if (checkout.external_customer_id !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  let activeSubscription = null;
  for await (const sub of iterListSubscriptions(polarClient)({
    customer_id: checkout.customer_id,
    active: true,
  })) {
    activeSubscription = sub;
    break;
  }

  if (!activeSubscription) {
    return c.json({ error: "No active subscription found" }, 404);
  }

  // Upsert the subscription row - idempotent if this URL is replayed.
  // The UNIQUE constraint on userId ensures only one row exists per user.
  const now = new Date();
  await db
    .insert(schema.subscription)
    .values({
      id: crypto.randomUUID(),
      plan: "pro",
      status: "active",
      createdAt: now,
      polarCustomerId: checkout.customer_id,
      userId: checkout.external_customer_id,
      polarSubscriptionId: activeSubscription.id,
      currentPeriodEnd: activeSubscription.current_period_end
        ? new Date(activeSubscription.current_period_end)
        : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.subscription.userId,
      set: {
        plan: "pro",
        status: "active",
        polarCustomerId: checkout.customer_id,
        polarSubscriptionId: activeSubscription.id,
        currentPeriodEnd: activeSubscription.current_period_end
          ? new Date(activeSubscription.current_period_end)
          : null,
        updatedAt: now,
      },
    });

  return c.redirect(billingSuccessRedirect(c.env));
});

// Mount BetterAuth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  try {
    const auth = createAuth(c.env, c.get("db"));
    return auth.handler(c.req.raw);
  } catch (error) {
    console.error("Error in auth handler:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Session middleware for protected routes - supports both cookie sessions and Bearer API keys
app.use("/api/v1/*", async (c, next) => {
  const auth = createAuth(c.env, c.get("db"));
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7);
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (!result.valid || !result.key) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", {
      id: result.key.referenceId,
      name: "",
      email: "",
    });
    c.set("session", null);
    c.set("apiKeyData", {
      userId: result.key.referenceId,
      permissions: result.key.permissions
        ? typeof result.key.permissions === "string"
          ? (JSON.parse(result.key.permissions as unknown as string) as Record<string, string[]>)
          : result.key.permissions
        : null,
    });
    return next();
  }

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  c.set("apiKeyData", null);
  await next();
});

// Health check
app.get("/ping", (c) => {
  return c.json({ status: "ok" });
});

// Subscription
app.route("/api/v1/subscription", subscription);

// Portal
app.route("/api/v1/portal", portal);

// API Keys
app.route("/api/v1/api-keys", apiKeys);

// Projects
app.route("/api/v1/projects", projects);

// Dashboard
app.route("/api/v1/dashboard", dashboard);

// Organizations
app.route("/api/v1/organizations", organizations);

export default app;
