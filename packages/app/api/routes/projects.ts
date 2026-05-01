import { Hono } from "hono";
import { eq, and, like, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { hasWriteAccess, isScopeViolation } from "../lib/permissions";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { AgnosticDatabaseInstance, Bindings, Variables } from "../types";

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
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.project)
      .where(eq(schema.project.userId, userId))
      .all();
    if (Number(rows[0]?.count ?? 0) >= limit) {
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

// GET /:projectId/toggles - list toggles for a project
projects.get("/:projectId/toggles", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const keyData = c.get("apiKeyData");
  if (keyData && isScopeViolation(keyData.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");
  const { search } = c.req.query();
  const searchFilter = search?.trim() ? like(schema.toggle.key, `%${search.trim()}%`) : undefined;

  if (keyData) {
    const project = await db
      .select()
      .from(schema.project)
      .where(eq(schema.project.id, projectId))
      .get();
    if (!project) return c.json({ error: "Not found" }, 404);

    const rows = await db
      .select()
      .from(schema.toggle)
      .where(
        searchFilter
          ? and(eq(schema.toggle.projectId, projectId), searchFilter)
          : eq(schema.toggle.projectId, projectId),
      )
      .all();
    return c.json(rows);
  }

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select()
    .from(schema.toggle)
    .where(
      searchFilter
        ? and(eq(schema.toggle.projectId, projectId), searchFilter)
        : eq(schema.toggle.projectId, projectId),
    )
    .all();

  return c.json(rows);
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

  // Session auth: must own the project. API key auth: just verify it exists.
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

  const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();

  return c.json(row, 201);
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
  }>();
  if (typeof body.enabled !== "boolean" && !("meta" in body)) {
    return c.json({ error: "enabled or meta is required" }, 400);
  }

  const now = new Date();
  await db
    .update(schema.toggle)
    .set({
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...("meta" in body ? { meta: body.meta } : {}),
      updatedAt: now,
    })
    .where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

  const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();

  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// GET /:projectId/toggles/one - get a single toggle
projects.get("/:projectId/toggles/one", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { pattern, flag } = c.req.query();

  if (!pattern && !flag) {
    return c.json({ error: "Need pattern / key query to get a toggle" }, 400);
  }

  const projectId = c.req.param("projectId");
  const keyData2 = c.get("apiKeyData");
  if (keyData2 && isScopeViolation(keyData2.permissions, projectId))
    return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const query = db.select().from(schema.toggle);

  if (pattern) {
    const normalizedPattern = `%${String(pattern).replace(/[-_ ]/g, "%")}%`;
    const rows = await query.where(like(schema.toggle.key, normalizedPattern)).limit(1).all();

    return c.json(rows.at(-1) ?? {});
  }

  const rows = await query.where(eq(schema.toggle.key, pattern)).limit(1).all();
  return c.json(rows.at(-1) ?? {});
});

// GET /:projectId/evaluate/:flagKey - evaluate a toggle in OpenFeature-compatible shape
projects.get("/:projectId/evaluate/:flagKey", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const flagKey = c.req.param("flagKey");
  const keyData = c.get("apiKeyData");
  if (keyData && isScopeViolation(keyData.permissions, projectId)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const db = c.get("db");

  const project = keyData
    ? await db.select().from(schema.project).where(eq(schema.project.id, projectId)).get()
    : await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const row = await db
    .select()
    .from(schema.toggle)
    .where(and(eq(schema.toggle.projectId, projectId), eq(schema.toggle.key, flagKey)))
    .get();

  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    key: row.key,
    value: row.enabled,
    variant: row.enabled ? "on" : "off",
    reason: "STATIC",
    metadata: {
      projectId: row.projectId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(row.meta ? { meta: row.meta } : {}),
    },
  });
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
