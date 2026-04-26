import { Hono } from "hono";
import { eq, and, like, inArray } from "drizzle-orm";
import * as schema from "../db/schema";
import { hasWriteAccess, isScopeViolation } from "../lib/permissions";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import type { AgnosticDatabaseInstance, Bindings, Variables } from "../types";

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

  // Get org IDs and team IDs the user belongs to
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

  // Fetch own projects
  const ownProjects = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.userId, userId))
    .all();

  // Fetch org-scoped projects the user can access
  let sharedProjects: (typeof schema.project.$inferSelect)[] = [];
  if (orgIds.length > 0) {
    const orgProjects = await db
      .select()
      .from(schema.project)
      .where(inArray(schema.project.organizationId, orgIds))
      .all();

    sharedProjects = orgProjects.filter((p) => {
      // Owned by user — already in ownProjects, skip
      if (p.userId === userId) return false;
      // No team restriction — org-wide, visible to all members
      if (!p.teamId) return true;
      // Team-restricted — only visible if user is in the team
      return teamIds.includes(p.teamId);
    });
  }

  // Merge and deduplicate by id
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
    const rows = await db
      .select()
      .from(schema.project)
      .where(eq(schema.project.userId, userId))
      .all();
    if (rows.length >= limit) {
      return c.json({ error: "Project limit reached for your plan" }, 403);
    }
  }

  // If associating with an org, verify the user is a member
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

    // If specifying a team, verify it belongs to that org
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

  // Clearing the org also clears the team
  if (newOrgId === null) {
    newTeamId = null;
  }

  // Validate org membership if setting an org
  if (newOrgId !== null) {
    const membership = await db
      .select()
      .from(schema.member)
      .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, newOrgId)))
      .get();
    if (!membership) return c.json({ error: "Not a member of that workspace" }, 403);

    // Validate team belongs to that org
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

// ── Toggle routes ─────────────────────────────────────────────

// Returns a project if the user owns it OR is an org member with access to it
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

  // Owner always has access
  if (project.userId === userId) return project;

  // Check org membership
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

    // Team-restricted: also require team membership
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

// Returns a project only if strictly owned by userId (for mutations that require ownership)
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
      .where(eq(schema.toggle.projectId, projectId))
      .all();
    return c.json(rows);
  }

  const project = await getAccessibleProject(db, projectId, userId);
  if (!project) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select()
    .from(schema.toggle)
    .where(eq(schema.toggle.projectId, projectId))
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

  const project = await getAccessibleProject(db, projectId, userId);
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
