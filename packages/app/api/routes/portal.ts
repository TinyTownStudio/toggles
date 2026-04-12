import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { Polar } from "@polar-sh/sdk";
import * as schema from "../db/schema";
import { isProduction } from "../utils/isProduction";
import type { Bindings, Variables } from "../types";

export const portal = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// GET / - returns a customer portal session URL using the stored polarCustomerId
portal.get("/", async (c) => {
  const user = c.get("user");
  if (!user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");

  const sub = await db
    .select()
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, user.id))
    .get();

  if (!sub?.polarCustomerId) {
    return c.json({ error: "No billing account found" }, 404);
  }

  const polarClient = new Polar({
    accessToken: c.env.POLAR_ACCESS_TOKEN,
    server: isProduction(c.env) ? "production" : "sandbox",
  });

  const customerSession = await polarClient.customerSessions.create({
    customerId: sub.polarCustomerId,
  });

  return c.json({ url: customerSession.customerPortalUrl });
});
