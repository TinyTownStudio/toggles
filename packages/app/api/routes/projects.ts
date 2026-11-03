import { Hono } from "hono";
import { eq, and, like, sql, asc, inArray } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  getDefaultEnvironment,
  resolveEnvironment,
  resolveToggleForEnv,
  seedToggleStatesForToggle,
  upsertToggleState,
} from "../lib/environments";
import { hasWriteAccess, isEnvScopeViolation, isScopeViolation } from "../lib/permissions";
import { getOwnedProject } from "../lib/projects";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import { globPatternToLike } from "../lib/globPattern";
import { consumeApiRead } from "../lib/usage";
import type { AgnosticDatabaseInstance, Bindings, Variables } from "../types";
import { environments } from "./environments";

export const projects = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// GET / - list all projects for the authenticated user (own + org/team shared)
projects.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const { search } = c.req.query();
  const searchFilter = search?.trim() ? like(schema.project.name, `%${search.trim()}%`) : undefined;
  const searchNeedle = search?.trim().toLowerCase();

  const memberships = await db
    .select()
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .all();
  const orgIds = memberships.map((m) => m.organizationId);

  const teamMemberships =
    orgIds.length > 0
      ? await db.select().from(schema.teamMember).where(eq(schema.teamMember.userId, userId)).all()
      : [];
  const teamIds = teamMemberships.map((tm) => tm.teamId);

  const ownProjects = await db
    .select()
    .from(schema.project)
    .where(
      searchFilter
        ? and(eq(schema.project.userId, userId), searchFilter)
        : eq(schema.project.userId, userId),
    )
    .all();

  let sharedProjects: (typeof schema.project.$inferSelect)[] = [];
  if (orgIds.length > 0) {
    const orgProjects = await db
      .select()
      .from(schema.project)
      .where(inArray(schema.project.organizationId, orgIds))
      .all();

    sharedProjects = orgProjects.filter((p) => {
      if (p.userId === userId) return false;
      if (searchNeedle && !p.name.toLowerCase().includes(searchNeedle)) return false;
      if (!p.teamId) return true;
      return teamIds.includes(p.teamId);
    });
  }

  const seen = new Set<string>();
  const rows = [...ownProjects, ...sharedProjects].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return c.json(rows);
});

// POST / - create a new project
projects.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{
    name?: string;
    organizationId?: string;
    teamId?: string;
  }>();
  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }

  const db = c.get("db");

  const plan = await getUserPlan(db, userId);
  const limit = PLAN_LIMITS[plan].projects;
  if (limit !== Infinity) {
    const existing = await db
      .select()
      .from(schema.project)
      .where(eq(schema.project.userId, userId))
      .all();
    if (existing.length >= limit) {
      return c.json({ error: "Project limit reached for your plan" }, 403);
    }
  }

  if (body.organizationId) {
    const membership = await db
      .select()
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, userId),
          eq(schema.member.organizationId, body.organizationId),
        ),
      )
      .get();
    if (!membership) {
      return c.json({ error: "Not a member of that workspace" }, 403);
    }

    if (body.teamId) {
      const team = await db
        .select()
        .from(schema.team)
        .where(
          and(eq(schema.team.id, body.teamId), eq(schema.team.organizationId, body.organizationId)),
        )
        .get();
      if (!team) {
        return c.json({ error: "Team not found in that workspace" }, 404);
      }
    }
  }

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(schema.project).values({
    id,
    userId,
    name: body.name.trim(),
    organizationId: body.organizationId ?? null,
    teamId: body.teamId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const row = await db.select().from(schema.project).where(eq(schema.project.id, id)).get();

  return c.json(row, 201);
});

// DELETE /:id - delete a project (must be owned by user)
projects.delete("/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const db = c.get("db");

  const row = await db
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, id), eq(schema.project.userId, userId)))
    .get();

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(schema.project).where(eq(schema.project.id, id));

  return c.body(null, 204);
});

// PATCH /:id - update a project's workspace/team association (owner only)
projects.patch("/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const db = c.get("db");

  const row = await db
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, id), eq(schema.project.userId, userId)))
    .get();

  if (!row) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    organizationId?: string | null;
    teamId?: string | null;
  }>();

  let newOrgId = "organizationId" in body ? (body.organizationId ?? null) : row.organizationId;
  let newTeamId = "teamId" in body ? (body.teamId ?? null) : row.teamId;

  if (newOrgId === null) {
    newTeamId = null;
  }

  if (newOrgId !== null) {
    const membership = await db
      .select()
      .from(schema.member)
      .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, newOrgId)))
      .get();
    if (!membership) return c.json({ error: "Not a member of that workspace" }, 403);

    if (newTeamId !== null) {
      const team = await db
        .select()
        .from(schema.team)
        .where(and(eq(schema.team.id, newTeamId), eq(schema.team.organizationId, newOrgId)))
        .get();
      if (!team) return c.json({ error: "Team not found in that workspace" }, 404);
    }
  }

  const now = new Date();
  await db
    .update(schema.project)
    .set({ organizationId: newOrgId, teamId: newTeamId, updatedAt: now })
    .where(eq(schema.project.id, id));

  const updated = await db.select().from(schema.project).where(eq(schema.project.id, id)).get();
  return c.json(updated);
});

async function getAccessibleProject(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  userId: string,
) {
  const project = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.id, projectId))
    .get();

  if (!project) return null;

  if (project.userId === userId) return project;

  if (project.organizationId) {
    const membership = await db
      .select()
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, userId),
          eq(schema.member.organizationId, project.organizationId),
        ),
      )
      .get();

    if (!membership) return null;

    if (project.teamId) {
      const teamMembership = await db
        .select()
        .from(schema.teamMember)
        .where(
          and(eq(schema.teamMember.teamId, project.teamId), eq(schema.teamMember.userId, userId)),
        )
        .get();
      if (!teamMembership) return null;
    }

    return project;
  }

  return null;
}

// Mount environment routes before toggle routes
projects.route("/:projectId/environments", environments);

// ── Toggle routes ─────────────────────────────────────────────

async function resolveToggleContext(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  envSlug: string | undefined,
  permissions: Record<string, string[]> | null,
) {
  let env;
  try {
    env = await resolveEnvironment(db, projectId, envSlug);
  } catch {
    return { error: "Environment not found" as const, status: 404 as const };
  }

  if (permissions && isEnvScopeViolation(permissions, env.slug)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  const defaultEnv = await getDefaultEnvironment(db, projectId);
  if (!defaultEnv) return { error: "Default environment not found" as const, status: 500 as const };

  return { env, defaultEnv };
}

async function formatToggleForEnv(
  db: AgnosticDatabaseInstance<typeof schema>,
  toggle: typeof schema.toggle.$inferSelect,
  env: typeof schema.environment.$inferSelect,
) {
  const { enabled, meta } = await resolveToggleForEnv(db, toggle, env);
  return {
    id: toggle.id,
    key: toggle.key,
    projectId: toggle.projectId,
    enabled,
    meta,
    environment: env.slug,
    createdAt: toggle.createdAt,
    updatedAt: toggle.updatedAt,
  };
}

// GET /:projectId/toggles - list toggles for a project
projects.get("/:projectId/toggles", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const keyData = c.get("apiKeyData");
  if (keyData && isScopeViolation(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");
  const { search, env: envSlug } = c.req.query();
  const searchFilter = search?.trim() ? like(schema.toggle.key, `%${search.trim()}%`) : undefined;

  if (keyData) {
    const project = await db
      .select()
      .from(schema.project)
      .where(eq(schema.project.id, projectId))
      .get();
    if (!project) return c.json({ error: "Not found" }, 404);

    const ctx = await resolveToggleContext(db, projectId, envSlug, keyData.permissions);
    if ("error" in ctx) return c.json({ error: ctx.error }, ctx.status);

    const allowed = await consumeApiRead(db, project.userId);
    if (!allowed) return c.json({ error: "API read limit reached for your plan" }, 429);

    const rows = await db
      .select()
      .from(schema.toggle)
      .where(
        searchFilter
          ? and(eq(schema.toggle.projectId, projectId), searchFilter)
          : eq(schema.toggle.projectId, projectId),
      )
      .all();

    const formatted = await Promise.all(
      rows.map((toggle) => formatToggleForEnv(db, toggle, ctx.env)),
    );
    return c.json(formatted);
  }

  const project = await getAccessibleProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const ctx = await resolveToggleContext(db, projectId, envSlug, null);
  if ("error" in ctx) return c.json({ error: ctx.error }, ctx.status);

  const rows = await db
    .select()
    .from(schema.toggle)
    .where(
      searchFilter
        ? and(eq(schema.toggle.projectId, projectId), searchFilter)
        : eq(schema.toggle.projectId, projectId),
    )
    .all();

  const formatted = await Promise.all(
    rows.map((toggle) => formatToggleForEnv(db, toggle, ctx.env)),
  );

  return c.json(formatted);
});

// POST /:projectId/toggles - create a toggle
projects.post("/:projectId/toggles", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const keyData = c.get("apiKeyData");
  if (keyData && !hasWriteAccess(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");

  const project = keyData
    ? await db.select().from(schema.project).where(eq(schema.project.id, projectId)).get()
    : await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ key?: string; enabled?: boolean }>();
  if (!body.key?.trim()) return c.json({ error: "key is required" }, 400);

  const plan = await getUserPlan(db, project.userId);
  const flagLimit = PLAN_LIMITS[plan].flags;
  if (flagLimit !== Infinity) {
    const countRow = await db
      .select({ total: sql<number>`count(${schema.toggle.id})` })
      .from(schema.toggle)
      .where(eq(schema.toggle.projectId, projectId))
      .get();
    if ((countRow?.total ?? 0) >= flagLimit) {
      return c.json({ error: "Flag limit reached for your plan" }, 403);
    }
  }

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(schema.toggle).values({
    id,
    projectId,
    key: body.key.trim(),
    enabled: false,
    createdAt: now,
    updatedAt: now,
  });

  await seedToggleStatesForToggle(db, projectId, id, { enabled: body.enabled ?? false });

  const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);

  const { env: envSlug } = c.req.query();
  const ctx = await resolveToggleContext(db, projectId, envSlug, keyData?.permissions ?? null);
  if ("error" in ctx) return c.json(row, 201);

  const formatted = await formatToggleForEnv(db, row, ctx.env);
  return c.json(formatted, 201);
});

// PATCH /:projectId/toggles/:id - update enabled state and/or meta
projects.patch("/:projectId/toggles/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const id = c.req.param("id");
  const keyData = c.get("apiKeyData");
  if (keyData && !hasWriteAccess(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");

  const project = keyData
    ? await db.select().from(schema.project).where(eq(schema.project.id, projectId)).get()
    : await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    enabled?: boolean;
    meta?: Record<string, string> | null;
    env?: string;
  }>();
  if (typeof body.enabled !== "boolean" && !("meta" in body)) {
    return c.json({ error: "enabled or meta is required" }, 400);
  }

  const { env: queryEnv } = c.req.query();
  const envSlug = body.env ?? queryEnv;
  const ctx = await resolveToggleContext(db, projectId, envSlug, keyData?.permissions ?? null);
  if ("error" in ctx) return c.json({ error: ctx.error }, ctx.status);

  const toggle = await db
    .select()
    .from(schema.toggle)
    .where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)))
    .get();
  if (!toggle) return c.json({ error: "Not found" }, 404);

  const now = new Date();

  if (typeof body.enabled === "boolean") {
    await upsertToggleState(db, id, ctx.env.id, { enabled: body.enabled });
  }

  if ("meta" in body) {
    await upsertToggleState(db, id, ctx.env.id, { meta: body.meta });
  }

  await db.update(schema.toggle).set({ updatedAt: now }).where(eq(schema.toggle.id, id));

  const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);

  const formatted = await formatToggleForEnv(db, row, ctx.env);
  return c.json(formatted);
});

// GET /:projectId/toggles/one - get a single toggle
projects.get("/:projectId/toggles/one", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { pattern, flag, env: envSlug } = c.req.query();

  if (!pattern && !flag) {
    return c.json({ error: "Need pattern / key query to get a toggle" }, 400);
  }

  const projectId = c.req.param("projectId");
  const keyData = c.get("apiKeyData");
  if (keyData && isScopeViolation(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");

  const project = keyData
    ? await db.select().from(schema.project).where(eq(schema.project.id, projectId)).get()
    : await getAccessibleProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const ctx = await resolveToggleContext(db, projectId, envSlug, keyData?.permissions ?? null);
  if ("error" in ctx) return c.json({ error: ctx.error }, ctx.status);

  if (keyData) {
    const allowed = await consumeApiRead(db, project.userId);
    if (!allowed) return c.json({ error: "API read limit reached for your plan" }, 429);
  }

  let toggle;
  if (pattern) {
    const { like: likePattern, escape } = globPatternToLike(String(pattern));
    const keyMatch = escape
      ? sql`${schema.toggle.key} LIKE ${likePattern} ESCAPE '\\'`
      : like(schema.toggle.key, likePattern);
    const rows = await db
      .select()
      .from(schema.toggle)
      .where(and(eq(schema.toggle.projectId, projectId), keyMatch))
      .orderBy(asc(schema.toggle.key))
      .limit(1)
      .all();
    toggle = rows[0];
  } else {
    const rows = await db
      .select()
      .from(schema.toggle)
      .where(and(eq(schema.toggle.projectId, projectId), eq(schema.toggle.key, flag!)))
      .limit(1)
      .all();
    toggle = rows.at(-1);
  }

  if (!toggle) return c.json({});

  const formatted = await formatToggleForEnv(db, toggle, ctx.env);
  return c.json(formatted);
});

// DELETE /:projectId/toggles/:id - delete a toggle
projects.delete("/:projectId/toggles/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const id = c.req.param("id");
  const keyData = c.get("apiKeyData");
  if (keyData && !hasWriteAccess(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");

  const project = keyData
    ? await db.select().from(schema.project).where(eq(schema.project.id, projectId)).get()
    : await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  await db
    .delete(schema.toggle)
    .where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

  return c.body(null, 204);
});
