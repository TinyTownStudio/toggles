import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    projects: 2,
    environments: 3,
    flags: 100,
    apiReadsPerMonth: 250_000,
    teams: false,
  },
  pro: {
    projects: Infinity,
    environments: Infinity,
    flags: Infinity,
    apiReadsPerMonth: 5_000_000,
    teams: true,
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
