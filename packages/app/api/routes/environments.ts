import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  ensureDefaultEnvironment,
  listProjectEnvironments,
  seedToggleStatesForEnvironment,
  slugifyEnvironmentName,
  syncToggleTableFromEnvironment,
} from "../lib/environments";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { AgnosticDatabaseInstance, Bindings, Variables } from "../types";

export const environments = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

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

// GET / - list environments for a project
environments.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  if (!projectId) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  await ensureDefaultEnvironment(db, projectId);
  const rows = await listProjectEnvironments(db, projectId);

  return c.json(rows);
});

// POST / - create a new environment
environments.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  if (!projectId) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ name?: string; slug?: string }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  await ensureDefaultEnvironment(db, projectId);

  const plan = await getUserPlan(db, userId);
  const limit = PLAN_LIMITS[plan].environments;
  if (limit !== Infinity) {
    const existing = await listProjectEnvironments(db, projectId);
    if (existing.length >= limit) {
      return c.json({ error: "Environment limit reached for your plan" }, 403);
    }
  }

  const slug = body.slug?.trim()
    ? slugifyEnvironmentName(body.slug)
    : slugifyEnvironmentName(body.name);
  if (!slug) return c.json({ error: "slug is required" }, 400);

  const existing = await db
    .select()
    .from(schema.environment)
    .where(and(eq(schema.environment.projectId, projectId), eq(schema.environment.slug, slug)))
    .get();
  if (existing) return c.json({ error: "Environment slug already exists" }, 409);

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(schema.environment).values({
    id,
    projectId,
    name: body.name.trim(),
    slug,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  });

  await seedToggleStatesForEnvironment(db, projectId, id);

  const row = await db.select().from(schema.environment).where(eq(schema.environment.id, id)).get();
  return c.json(row, 201);
});

// PATCH /:id - rename or promote default
environments.patch("/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const id = c.req.param("id");
  if (!projectId || !id) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const env = await db
    .select()
    .from(schema.environment)
    .where(and(eq(schema.environment.id, id), eq(schema.environment.projectId, projectId)))
    .get();
  if (!env) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ name?: string; isDefault?: boolean }>();
  if (!body.name?.trim() && body.isDefault !== true) {
    return c.json({ error: "name or isDefault is required" }, 400);
  }

  const now = new Date();

  if (body.isDefault === true && !env.isDefault) {
    await db
      .update(schema.environment)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(schema.environment.projectId, projectId));

    await db
      .update(schema.environment)
      .set({
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        isDefault: true,
        updatedAt: now,
      })
      .where(eq(schema.environment.id, id));

    await syncToggleTableFromEnvironment(db, projectId, id);
  } else if (body.name?.trim()) {
    await db
      .update(schema.environment)
      .set({ name: body.name.trim(), updatedAt: now })
      .where(eq(schema.environment.id, id));
  }

  const row = await db.select().from(schema.environment).where(eq(schema.environment.id, id)).get();
  return c.json(row);
});

// DELETE /:id - delete a non-default environment
environments.delete("/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const id = c.req.param("id");
  if (!projectId || !id) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const project = await getOwnedProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const env = await db
    .select()
    .from(schema.environment)
    .where(and(eq(schema.environment.id, id), eq(schema.environment.projectId, projectId)))
    .get();
  if (!env) return c.json({ error: "Not found" }, 404);

  if (env.isDefault) {
    return c.json({ error: "Cannot delete the default environment" }, 400);
  }

  const countRow = await listProjectEnvironments(db, projectId);
  if (countRow.length <= 1) {
    return c.json({ error: "Cannot delete the last environment" }, 400);
  }

  await db.delete(schema.environment).where(eq(schema.environment.id, id));

  return c.body(null, 204);
});
