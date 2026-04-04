import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { createAuth } from "../lib/auth";
import type { Bindings, Variables, ApiKeyMeta } from "../types";

export const apiKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/v1/api-keys - list keys for the authenticated user
apiKeys.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const rows = await db.select().from(schema.apikey).where(eq(schema.apikey.userId, userId)).all();

  // Parse metadata JSON and omit the hashed key from each row
  const result = rows.map(({ key: _key, ...rest }) => ({
    ...rest,
    metadata: rest.metadata ? (JSON.parse(rest.metadata as unknown as string) as ApiKeyMeta) : null,
    permissions: rest.permissions
      ? (JSON.parse(rest.permissions as unknown as string) as Record<string, string[]>)
      : null,
  }));

  return c.json(result);
});

// POST /api/v1/api-keys - create a new API key
apiKeys.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ name?: string; projectId?: string | null }>();

  const auth = createAuth(c.env);
  const db = drizzle(c.env.DB, { schema });

  // If scoped to a project, verify the user owns it
  if (body.projectId) {
    const project = await db
      .select()
      .from(schema.project)
      .where(and(eq(schema.project.id, body.projectId), eq(schema.project.userId, userId)))
      .get();
    if (!project) return c.json({ error: "Project not found" }, 404);
  }

  const meta: ApiKeyMeta = { projectId: body.projectId ?? null };

  const res = await auth.api.createApiKey({
    body: {
      name: body.name?.trim() || "Unnamed",
      userId,
      metadata: meta,
      permissions: { toggles: ["read"] },
    },
  });

  return c.json(
    {
      ...res,
      metadata: meta,
      permissions: { toggles: ["read"] },
    },
    201,
  );
});

// DELETE /api/v1/api-keys/:id - revoke a key
apiKeys.delete("/:id", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const db = drizzle(c.env.DB, { schema });

  const row = await db
    .select()
    .from(schema.apikey)
    .where(and(eq(schema.apikey.id, id), eq(schema.apikey.userId, userId)))
    .get();

  if (!row) return c.json({ error: "Not found" }, 404);

  const auth = createAuth(c.env);
  await auth.api.deleteApiKey({ body: { keyId: id } });

  return c.body(null, 204);
});
