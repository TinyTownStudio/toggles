import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";

type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    // Add your free plan limits here
  },
  pro: {
    // Add your pro plan limits here
  },
} as const;

export async function getUserPlan(
  db: BetterSQLite3Database<typeof schema>,
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
