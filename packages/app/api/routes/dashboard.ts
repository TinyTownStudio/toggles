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
  const [userProjects, allTogglesWithProject, recentlyModifiedRows, staleFlagRows, allApiKeys] =
    await Promise.all([
      // All user projects
      db.select().from(schema.project).where(eq(schema.project.userId, userId)).all(),

      // All toggles joined with project for count aggregation
      db
        .select()
        .from(schema.toggle)
        .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
        .where(eq(schema.project.userId, userId))
        .all(),

      // Top 5 most recently modified flags
      db
        .select()
        .from(schema.toggle)
        .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
        .where(eq(schema.project.userId, userId))
        .orderBy(sql`${schema.toggle.updatedAt} desc`)
        .limit(5)
        .all(),

      // Stale flags: not modified in STALE_FLAG_DAYS days, oldest first
      db
        .select()
        .from(schema.toggle)
        .innerJoin(schema.project, eq(schema.toggle.projectId, schema.project.id))
        .where(and(eq(schema.project.userId, userId), lt(schema.toggle.updatedAt, staleThreshold)))
        .orderBy(schema.toggle.updatedAt)
        .all(),

      // All API keys for the user
      db.select().from(schema.apikey).where(eq(schema.apikey.userId, userId)).all(),
    ]);

  const totalProjects = userProjects.length;

  const totalFlags = allTogglesWithProject.length;
  const enabledFlags = allTogglesWithProject.filter((r) => r.toggle.enabled).length;
  const disabledFlags = totalFlags - enabledFlags;

  const toEntry = (r: {
    toggle: typeof schema.toggle.$inferSelect;
    project: typeof schema.project.$inferSelect;
  }): DashboardFlagEntry => ({
    id: r.toggle.id,
    key: r.toggle.key,
    projectId: r.toggle.projectId,
    projectName: r.project.name,
    enabled: r.toggle.enabled,
    updatedAt:
      r.toggle.updatedAt instanceof Date
        ? r.toggle.updatedAt.getTime()
        : Number(r.toggle.updatedAt),
    createdAt:
      r.toggle.createdAt instanceof Date
        ? r.toggle.createdAt.getTime()
        : Number(r.toggle.createdAt),
  });

  const recentlyModified = recentlyModifiedRows.map(toEntry);
  const staleFlags = staleFlagRows.map(toEntry);

  // Compute flagsPerProject in memory
  const projectFlagMap = new Map<string, { name: string; total: number; enabled: number }>();
  for (const proj of userProjects) {
    projectFlagMap.set(proj.id, { name: proj.name, total: 0, enabled: 0 });
  }
  for (const r of allTogglesWithProject) {
    const entry = projectFlagMap.get(r.project.id);
    if (entry) {
      entry.total += 1;
      if (r.toggle.enabled) entry.enabled += 1;
    }
  }
  const flagsPerProject: DashboardProjectEntry[] = Array.from(projectFlagMap.entries()).map(
    ([projectId, data]) => ({
      projectId,
      projectName: data.name,
      totalFlags: data.total,
      enabledFlags: data.enabled,
    }),
  );

  const totalApiKeys = allApiKeys.length;
  const activeApiKeys = allApiKeys.filter((k) => k.enabled).length;
  const unusedApiKeys = allApiKeys.filter((k) => k.lastRequest == null).length;
  const expiringApiKeys = allApiKeys.filter(
    (k) => k.expiresAt != null && new Date(k.expiresAt).getTime() <= sevenDaysFromNow.getTime(),
  ).length;

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
