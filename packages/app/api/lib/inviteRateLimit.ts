import { and, eq, gte, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

export function resolveInviteRateLimitPerHour(env: {
  TOGGLES_ORG_INVITES_PER_HOUR?: string;
}): number {
  const raw = env.TOGGLES_ORG_INVITES_PER_HOUR?.trim();
  if (raw === "0") return 0;
  if (!raw) return 20;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 20;
  return parsed;
}

export async function countRecentInvites(
  db: AgnosticDatabaseInstance<typeof schema>,
  organizationId: string,
  since: Date,
): Promise<number> {
  const row = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.invitation)
    .where(
      and(
        eq(schema.invitation.organizationId, organizationId),
        gte(schema.invitation.createdAt, since),
      ),
    )
    .get();
  return row?.total ?? 0;
}
