import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createCustomerSessions } from "@polar-sh/sdk/2026-10/services/customer_sessions";
import * as schema from "../db/schema";
import { createPolarClient } from "../lib/polarClient";
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

  const polarClient = createPolarClient(c.env);

  const customerSession = await createCustomerSessions(polarClient)({
    customer_id: sub.polarCustomerId,
  });

  return c.json({ url: customerSession.customer_portal_url });
});
