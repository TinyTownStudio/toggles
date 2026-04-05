import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    projects: 10,
    toggles: Infinity,
    teams: false,
  },
  pro: {
    maxProjects: Infinity,
    teams: Infinity,
  },
} as const;

export async function getUserPlan(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
): Promise<Plan> {
  const row = await db
    .select({ plan: schema.subscription.plan })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, userId))
    .get();

  if (!row || row.plan !== "pro") return "free";
  return "pro";
}
