import { getUserPlan, PLAN_LIMITS } from "./plans";
import type { AgnosticDatabaseInstance } from "../types";
import type * as schema from "../db/schema";

export interface BillingEnv {
  POLAR_ACCESS_TOKEN?: string;
  TOGGLES_BILLING_ENABLED?: string;
  TOGGLES_SELF_HOST_BUILD?: string;
  PRODUCT_BETA?: string;
  DB?: D1Database;
  DATABASE_URL?: string;
}

/** When false, workspace/teams features are available without a Pro subscription (self-host). */
export function isBillingEnforced(env: BillingEnv): boolean {
  const explicit = env.TOGGLES_BILLING_ENABLED?.trim().toLowerCase();
  if (explicit === "false") return false;
  if (explicit === "true") return true;

  if (env.TOGGLES_SELF_HOST_BUILD === "true") return false;

  // Node/Docker self-host: SQLite via DATABASE_URL, no Workers DB binding.
  if (env.DB === undefined && env.DATABASE_URL?.trim()) return false;

  // Hosted Workers default: enforce billing even if Polar secrets are missing (misconfig must not drop the gate).
  return true;
}

export async function canUseTeams(
  env: BillingEnv,
  db: AgnosticDatabaseInstance<typeof schema>,
  userId: string,
): Promise<boolean> {
  if (!isBillingEnforced(env)) return true;

  if (env.PRODUCT_BETA === "true") return true;

  const plan = await getUserPlan(db, userId);
  return PLAN_LIMITS[plan].teams;
}
