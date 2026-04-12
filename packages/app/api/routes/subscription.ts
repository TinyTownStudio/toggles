import { Hono } from "hono";
import * as schema from "../db/schema";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { Bindings, Variables } from "../types";
import { env } from "hono/adapter";

export const subscription = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// GET / - returns user's current plan and limits
subscription.get("/", async (c) => {
  const db = c.get("db");
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const plan = await getUserPlan(db, userId);
  const limits = PLAN_LIMITS[plan];
  let betaFeatures: Record<string, boolean> = {};
  if (env(c).PRODUCT_BETA === "true") {
    betaFeatures.product = true;
  }

  return c.json({
    plan,
    limits,
    beta: betaFeatures,
  });
});
