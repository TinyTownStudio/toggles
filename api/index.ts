import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { Polar } from "@polar-sh/sdk";
import { createAuth } from "./lib/auth";
import { subscriptionRoutes } from "./routes/subscription";
import { projectRoutes } from "./routes/projects";
import { isProduction } from "./utils/isProduction";
import * as schema from "./db/schema";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { UserContext, SessionContext, Env } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Type Declarations ─────────────────────────────────────────

declare module "fastify" {
  interface FastifyRequest {
    user: UserContext;
    session: SessionContext;
  }
  interface FastifyInstance {
    env: Env;
    db: BetterSQLite3Database<typeof schema>;
    auth: ReturnType<typeof createAuth>;
  }
}

// ── Initialize Fastify ────────────────────────────────────────

const fastify = Fastify({ logger: true });

// Initialize env, db, and auth as decorators
const env = process.env as unknown as Env;
fastify.decorate("env", env);
fastify.decorate("db", drizzle(fastify.env.DATABASE_URL, { schema }));
fastify.decorate("auth", createAuth(fastify));

// ── CORS ──────────────────────────────────────────────────────

await fastify.register(cors, {
  origin: isProduction() ? "https://app.example.com" : "http://localhost:5173",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
});

// ── Security Headers ──────────────────────────────────────────

fastify.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.url.startsWith("/api/")) {
    reply.headers({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    });
  }
});

// ── Session Authentication ────────────────────────────────────

fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.url.startsWith("/api/v1/")) {
    const session = await fastify.auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!session) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    request.user = session.user as UserContext;
    request.session = session.session as SessionContext;
  }
});

// ── Routes ────────────────────────────────────────────────────

// Health check
fastify.get("/ping", async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ status: "ok" });
});

// BetterAuth handler
fastify.all("/api/auth/*", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const url = `${request.protocol}://${request.hostname}${request.url}`;
    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers as unknown as Headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const response = await fastify.auth.handler(webRequest);

    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    reply.code(response.status);

    if (response.body) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await response.json();
        return reply.send(json);
      } else {
        const text = await response.text();
        return reply.send(text);
      }
    }

    return reply.send();
  } catch (error) {
    console.error("Error in auth handler:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
});

// Billing success
fastify.get("/api/billing-success", async (request: FastifyRequest, reply: FastifyReply) => {
  const { checkout_id } = request.query as { checkout_id?: string };

  if (!checkout_id) {
    return reply.code(400).send({ error: "Missing checkout_id parameter" });
  }

  const db = fastify.db;
  const polarClient = new Polar({
    accessToken: fastify.env.POLAR_ACCESS_TOKEN,
    server: isProduction() ? "production" : "sandbox",
  });

  const checkout = await polarClient.checkouts.get({ id: checkout_id });

  if (!checkout || !checkout.customerId) {
    return reply.code(400).send({ error: "Invalid checkout session" });
  }

  const subscriptions = await polarClient.subscriptions.list({
    customerId: checkout.customerId,
    active: true,
  });

  let activeSubscription = null;
  for await (const sub of subscriptions) {
    const page = sub.result;
    if (page.items && page.items.length > 0) {
      activeSubscription = page.items[0];
      break;
    }
  }

  if (!activeSubscription) {
    return reply.code(404).send({ error: "No active subscription found" });
  }

  const now = new Date();
  await db.insert(schema.subscription).values({
    id: crypto.randomUUID(),
    plan: "pro",
    status: "active",
    createdAt: now,
    polarCustomerId: checkout.customerId,
    userId: checkout.externalCustomerId as string,
    polarSubscriptionId: activeSubscription.id,
    currentPeriodEnd: activeSubscription.currentPeriodEnd
      ? new Date(activeSubscription.currentPeriodEnd)
      : null,
    updatedAt: now,
  });

  return reply.redirect(
    isProduction()
      ? "https://app.example.com/billing?success=true"
      : "http://localhost:5173/billing?success=true",
  );
});

// Protected routes
fastify.get("/api/v1/me", async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ user: request.user });
});

// Mount route modules
await fastify.register(subscriptionRoutes, { prefix: "/api/v1/subscription" });
await fastify.register(projectRoutes, { prefix: "/api/v1/projects" });

// TODO: abstract this away to allow other node servers to also be allowed to connect.
export const devServer = async (): Promise<typeof fastify> => {
  await fastify.ready();
  return fastify;
};

if (import.meta.env.PROD) {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, "../client"),
    prefix: "/",
  });

  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith("/api/")) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "Not Found" });
  });

  try {
    const port = env.PORT ? parseInt(env.PORT) : 3000;
    const host = env.HOST ?? "0.0.0.0";
    await fastify.listen({ port, host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
      await fastify.close();
      process.exit(0);
    });
  });
}
