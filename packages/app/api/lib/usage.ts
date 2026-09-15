import { and, eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";
import { getUserPlan, PLAN_LIMITS } from "./plans";

export function currentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Consume one API read for the project owner.
 * Returns false if the account is over its monthly limit.
 */
export async function consumeApiRead(
  db: AgnosticDatabaseInstance<typeof schema>,
  userId: string,
): Promise<boolean> {
  const plan = await getUserPlan(db, userId);
  const limit = PLAN_LIMITS[plan].apiReadsPerMonth;
  const month = currentMonth();

  const existing = await db
    .select({ reads: schema.apiUsage.reads })
    .from(schema.apiUsage)
    .where(and(eq(schema.apiUsage.userId, userId), eq(schema.apiUsage.month, month)))
    .get();

  const current = existing?.reads ?? 0;
  if (limit !== Infinity && current >= limit) {
    return false;
  }

  if (existing) {
    await db
      .update(schema.apiUsage)
      .set({ reads: sql`${schema.apiUsage.reads} + 1` })
      .where(and(eq(schema.apiUsage.userId, userId), eq(schema.apiUsage.month, month)));
  } else {
    await db.insert(schema.apiUsage).values({
      userId,
      month,
      reads: 1,
    });
  }

  return true;
}
