import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

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
  db: AgnosticDatabaseInstance<typeof schema>,
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
