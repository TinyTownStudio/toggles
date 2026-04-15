import { Hono } from "hono";
import { eq, lt, and, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { Bindings, Variables } from "../types";
import { env } from "hono/adapter";

// Flags not modified within this many days are considered stale.
// TODO: make this configurable via user settings when that feature is added.
const STALE_FLAG_DAYS = 30;

export interface DashboardFlagEntry {
  id: string;
  key: string;
  projectId: string;
  projectName: string;
  enabled: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface DashboardProjectEntry {
  projectId: string;
  projectName: string;
  totalFlags: number;
  enabledFlags: number;
}

export interface DashboardResponse {
  totalProjects: number;
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  totalApiKeys: number;
  activeApiKeys: number;
  unusedApiKeys: number;
  expiringApiKeys: number;
  recentlyModified: DashboardFlagEntry[];
  staleFlags: DashboardFlagEntry[];
  flagsPerProject: DashboardProjectEntry[];
  plan: "free" | "pro";
  limits: (typeof PLAN_LIMITS)["free"] | (typeof PLAN_LIMITS)["pro"];
  beta: Record<string, boolean>;
}

export const dashboard = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

dashboard.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");

  const staleThreshold = new Date(Date.now() - STALE_FLAG_DAYS * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Run all independent queries in parallel
  const [
    userProjects,
    flagCountRows,
    recentlyModifiedRows,
    staleFlagRows,
    flagsPerProjectRows,
    apiKeyCountRows,
  ] = await Promise.all([
    // All user projects (needed for totalProjects and flagsPerProject join)
    db
      .select({ id: schema.project.id, name: schema.project.name })
      .from(schema.project)
      .where(eq(schema.project.userId, userId))
      .all(),

    // Aggregate flag counts via SQL
    db
      .select({
        total: sql<number>`count(*)`,
        enabled: sql<number>`sum(case when ${schema.toggle.enabled} = 1 then 1 else 0 end)`,
      })
      .from(schema.toggle)
      .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
      .where(eq(schema.project.userId, userId))
      .all(),

    // Top 5 most recently modified flags
    db
      .select({
        id: schema.toggle.id,
        key: schema.toggle.key,
        projectId: schema.toggle.projectId,
        projectName: schema.project.name,
        enabled: schema.toggle.enabled,
        updatedAt: schema.toggle.updatedAt,
        createdAt: schema.toggle.createdAt,
      })
      .from(schema.toggle)
      .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
      .where(eq(schema.project.userId, userId))
      .orderBy(sql`${schema.toggle.updatedAt} desc`)
      .limit(5)
      .all(),

    // Stale flags: not modified in STALE_FLAG_DAYS days, oldest first
    db
      .select({
        id: schema.toggle.id,
        key: schema.toggle.key,
        projectId: schema.toggle.projectId,
        projectName: schema.project.name,
        enabled: schema.toggle.enabled,
        updatedAt: schema.toggle.updatedAt,
        createdAt: schema.toggle.createdAt,
      })
      .from(schema.toggle)
      .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
      .where(and(eq(schema.project.userId, userId), lt(schema.toggle.updatedAt, staleThreshold)))
      .orderBy(schema.toggle.updatedAt)
      .all(),

    // Per-project flag counts via GROUP BY
    db
      .select({
        projectId: schema.project.id,
        projectName: schema.project.name,
        totalFlags: sql<number>`count(${schema.toggle.id})`,
        enabledFlags: sql<number>`sum(case when ${schema.toggle.enabled} = 1 then 1 else 0 end)`,
      })
      .from(schema.project)
      .leftJoin(schema.toggle, eq(schema.toggle.projectId, schema.project.id))
      .where(eq(schema.project.userId, userId))
      .groupBy(schema.project.id, schema.project.name)
      .all(),

    // API key aggregate counts via SQL
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${schema.apikey.enabled} != 0 then 1 else 0 end)`,
        unused: sql<number>`sum(case when ${schema.apikey.lastRequest} is null then 1 else 0 end)`,
        expiring: sql<number>`sum(case when ${schema.apikey.expiresAt} is not null and ${schema.apikey.expiresAt} <= ${sevenDaysFromNow.getTime()} then 1 else 0 end)`,
      })
      .from(schema.apikey)
      .where(eq(schema.apikey.userId, userId))
      .all(),
  ]);

  const totalProjects = userProjects.length;

  const flagCounts = flagCountRows[0] ?? { total: 0, enabled: 0 };
  const totalFlags = Number(flagCounts.total);
  const enabledFlags = Number(flagCounts.enabled ?? 0);
  const disabledFlags = totalFlags - enabledFlags;

  const toEntry = (t: {
    id: string;
    key: string;
    projectId: string;
    projectName: string;
    enabled: boolean;
    updatedAt: Date | number | null;
    createdAt: Date | number | null;
  }): DashboardFlagEntry => ({
    id: t.id,
    key: t.key,
    projectId: t.projectId,
    projectName: t.projectName,
    enabled: t.enabled,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.getTime() : Number(t.updatedAt),
    createdAt: t.createdAt instanceof Date ? t.createdAt.getTime() : Number(t.createdAt),
  });

  const recentlyModified = recentlyModifiedRows.map(toEntry);
  const staleFlags = staleFlagRows.map(toEntry);

  const flagsPerProject: DashboardProjectEntry[] = flagsPerProjectRows.map((row) => ({
    projectId: row.projectId,
    projectName: row.projectName,
    totalFlags: Number(row.totalFlags),
    enabledFlags: Number(row.enabledFlags ?? 0),
  }));

  const apiKeyCounts = apiKeyCountRows[0] ?? { total: 0, active: 0, unused: 0, expiring: 0 };
  const totalApiKeys = Number(apiKeyCounts.total);
  const activeApiKeys = Number(apiKeyCounts.active ?? 0);
  const unusedApiKeys = Number(apiKeyCounts.unused ?? 0);
  const expiringApiKeys = Number(apiKeyCounts.expiring ?? 0);

  // Plan info
  const plan = await getUserPlan(db, userId);
  const limits = PLAN_LIMITS[plan];
  const productBeta = env(c).PRODUCT_BETA === "true";

  const response: DashboardResponse = {
    totalProjects,
    totalFlags,
    enabledFlags,
    disabledFlags,
    totalApiKeys,
    activeApiKeys,
    unusedApiKeys,
    expiringApiKeys,
    recentlyModified,
    staleFlags,
    flagsPerProject,
    plan,
    beta: {
      product: productBeta,
    },
    limits,
  };

  return c.json(response);
});
