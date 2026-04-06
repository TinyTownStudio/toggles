import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { Polar } from "@polar-sh/sdk";
import { createAuth } from "./lib/auth";
import { subscription } from "./routes/subscription";
import { projects } from "./routes/projects";
import { apiKeys } from "./routes/apiKeys";
import { dashboard } from "./routes/dashboard";
import { portal } from "./routes/portal";
import type { Bindings, Variables } from "./types";
import { isProduction } from "./utils/isProduction";
import * as schema from "./db/schema";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Security response headers
app.use("/api/*", async (c, next) => {
  await next();
  c.res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
});

// CORS - allow the frontend origin and credentials (cookies)
app.use(
  "/api/*",
  cors({
    origin: (_origin, c) =>
      isProduction(c.env) ? "https://toggles.tinytown.studio" : "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.get("/api/billing-success", async (c) => {
  // Require an authenticated session — only the paying user should trigger their own upgrade.
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = drizzle(c.env.DB, { schema });

  const checkoutId = c.req.query("checkout_id");
  if (!checkoutId) {
    return c.json({ error: "Missing checkout_id parameter" }, 400);
  }

  // Initialize Polar client
  const polarClient = new Polar({
    accessToken: c.env.POLAR_ACCESS_TOKEN,
    server: isProduction(c.env) ? "production" : "sandbox",
  });

  // Get checkout session to retrieve customer_id
  const checkout = await polarClient.checkouts.get({ id: checkoutId });

  if (!checkout || !checkout.customerId) {
    return c.json({ error: "Invalid checkout session" }, 400);
  }

  // Verify that this checkout belongs to the authenticated user.
  // externalCustomerId is set by BetterAuth's Polar plugin to the user's ID.
  if (!checkout.externalCustomerId) {
    return c.json({ error: "Checkout has no associated user" }, 400);
  }
  if (checkout.externalCustomerId !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // List subscriptions for this customer
  const subscriptions = await polarClient.subscriptions.list({
    customerId: checkout.customerId,
    active: true,
  });

  // Find the active subscription (should be the most recent one)
  let activeSubscription = null;
  for await (const sub of subscriptions) {
    const page = sub.result;
    if (page.items && page.items.length > 0) {
      // Get the first active subscription
      activeSubscription = page.items[0];
      break;
    }
  }

  if (!activeSubscription) {
    return c.json({ error: "No active subscription found" }, 404);
  }

  // Upsert the subscription row — idempotent if this URL is replayed.
  // The UNIQUE constraint on userId ensures only one row exists per user.
  const now = new Date();
  await db
    .insert(schema.subscription)
    .values({
      id: crypto.randomUUID(),
      plan: "pro",
      status: "active",
      createdAt: now,
      polarCustomerId: checkout.customerId,
      userId: checkout.externalCustomerId,
      polarSubscriptionId: activeSubscription.id,
      currentPeriodEnd: activeSubscription.currentPeriodEnd
        ? new Date(activeSubscription.currentPeriodEnd)
        : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.subscription.userId,
      set: {
        plan: "pro",
        status: "active",
        polarCustomerId: checkout.customerId,
        polarSubscriptionId: activeSubscription.id,
        currentPeriodEnd: activeSubscription.currentPeriodEnd
          ? new Date(activeSubscription.currentPeriodEnd)
          : null,
        updatedAt: now,
      },
    });

  return c.redirect(
    isProduction(c.env)
      ? "https://toggles.tinytown.studio/app/billing?success=true"
      : "http://localhost:5173/app/billing?success=true",
  );
});

// Mount BetterAuth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  try {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
  } catch (error) {
    console.error("Error in auth handler:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Session middleware for protected routes - supports both cookie sessions and Bearer API keys
app.use("/api/v1/*", async (c, next) => {
  const auth = createAuth(c.env);
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7);
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (!result.valid || !result.key) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", {
      id: result.key.userId,
      name: "",
      email: "",
    });
    c.set("session", null);
    c.set("apiKeyData", {
      userId: result.key.userId,
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
app.get("/", (c) => {
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

export default app;
