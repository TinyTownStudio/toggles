import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { createAuth } from "../lib/auth";
import { buildPermissions, deriveTokenType } from "../lib/permissions";
import type { TokenType } from "../lib/permissions";
import type { Bindings, Variables } from "../types";

export const apiKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/v1/api-keys - list keys for the authenticated user
apiKeys.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const rows = await db.select().from(schema.apikey).where(eq(schema.apikey.userId, userId)).all();

  const result = rows.map(({ key: _key, metadata: _metadata, ...rest }) => {
    const permissions = rest.permissions
      ? (JSON.parse(rest.permissions as unknown as string) as Record<string, string[]>)
      : null;
    return {
      ...rest,
      permissions,
      type: deriveTokenType(permissions),
    };
  });

  return c.json(result);
});

// POST /api/v1/api-keys - create a new API key
apiKeys.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ name?: string; type?: TokenType; projectId?: string | null }>();
  const tokenType: TokenType = body.type === "admin" ? "admin" : "read";
  const projectId = body.projectId ?? null;

  const auth = createAuth(c.env);
  const db = drizzle(c.env.DB, { schema });

  // If scoped to a project, verify the user owns it
  if (projectId) {
    const project = await db
      .select()
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)))
      .get();
    if (!project) return c.json({ error: "Project not found" }, 404);
  }

  const permissions = buildPermissions(tokenType, projectId);

  const res = await auth.api.createApiKey({
    body: {
      name: body.name?.trim() || "Unnamed",
      userId,
      permissions,
    },
  });

  return c.json(
    {
      ...res,
      permissions,
      type: tokenType,
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
