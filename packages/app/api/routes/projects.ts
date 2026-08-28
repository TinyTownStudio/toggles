import { Hono } from "hono";
import { eq, and, like } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  getDefaultEnvironment,
  resolveEnvironment,
  resolveToggleForEnv,
  seedToggleStatesForToggle,
  upsertToggleState,
} from "../lib/environments";
import { hasWriteAccess, isEnvScopeViolation, isScopeViolation } from "../lib/permissions";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { AgnosticDatabaseInstance, Bindings, Variables } from "../types";
import { environments } from "./environments";

export const projects = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// GET / - list all projects for the authenticated user
projects.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const { search } = c.req.query();
  const searchFilter = search?.trim() ? like(schema.project.name, `%${search.trim()}%`) : undefined;

  const rows = await db
    .select()
    .from(schema.project)
    .where(
      searchFilter
        ? and(eq(schema.project.userId, userId), searchFilter)
        : eq(schema.project.userId, userId),
    )
    .all();

  return c.json(rows);
});

// POST / - create a new project
projects.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ name?: string }>();
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

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(schema.project).values({
    id,
    userId,
    name: body.name.trim(),
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

// Mount environment routes before toggle routes
projects.route("/:projectId/environments", environments);

// ── Toggle routes ─────────────────────────────────────────────

async function getOwnedProject(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  userId: string,
) {
  return db
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)))
    .get();
}

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
  const { enabled, meta } = await resolveToggleForEnv(db, toggle.id, env.id);
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

  const project = await getOwnedProject(db, projectId, userId);
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

  const formatted = await Promise.all(rows.map((toggle) => formatToggleForEnv(db, toggle, ctx.env)));

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

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(schema.toggle).values({
    id,
    projectId,
    key: body.key.trim(),
    enabled: body.enabled ?? false,
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
  const toggleUpdates: Partial<typeof schema.toggle.$inferInsert> = { updatedAt: now };

  if (typeof body.enabled === "boolean") {
    await upsertToggleState(db, id, ctx.env.id, { enabled: body.enabled });
    if (ctx.env.isDefault) toggleUpdates.enabled = body.enabled;
  }

  if ("meta" in body) {
    await upsertToggleState(db, id, ctx.env.id, { meta: body.meta });
    if (ctx.env.isDefault) toggleUpdates.meta = body.meta;
  }

  if (Object.keys(toggleUpdates).length > 1) {
    await db.update(schema.toggle).set(toggleUpdates).where(eq(schema.toggle.id, id));
  }

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
    : await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const ctx = await resolveToggleContext(db, projectId, envSlug, keyData?.permissions ?? null);
  if ("error" in ctx) return c.json({ error: ctx.error }, ctx.status);

  let toggle;
  if (pattern) {
    const normalizedPattern = `%${String(pattern).replace(/[-_ ]/g, "%")}%`;
    const rows = await db
      .select()
      .from(schema.toggle)
      .where(
        and(eq(schema.toggle.projectId, projectId), like(schema.toggle.key, normalizedPattern)),
      )
      .limit(1)
      .all();
    toggle = rows.at(-1);
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
