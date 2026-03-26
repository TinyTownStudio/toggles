import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import type { Bindings, Variables } from "../types";

export const projects = new Hono<{
	Bindings: Bindings;
	Variables: Variables;
}>();

// GET / — list all projects for the authenticated user
projects.get("/", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = drizzle(c.env.DB, { schema });
	const rows = await db
		.select()
		.from(schema.project)
		.where(eq(schema.project.userId, userId))
		.all();

	return c.json(rows);
});

// POST / — create a new project
projects.post("/", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{ name?: string }>();
	if (!body.name?.trim()) {
		return c.json({ error: "name is required" }, 400);
	}

	const db = drizzle(c.env.DB, { schema });
	const now = new Date();
	const id = crypto.randomUUID();

	await db.insert(schema.project).values({
		id,
		userId,
		name: body.name.trim(),
		createdAt: now,
		updatedAt: now,
	});

	const row = await db
		.select()
		.from(schema.project)
		.where(eq(schema.project.id, id))
		.get();

	return c.json(row, 201);
});

// DELETE /:id — delete a project (must be owned by user)
projects.delete("/:id", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = drizzle(c.env.DB, { schema });

	const row = await db
		.select()
		.from(schema.project)
		.where(and(eq(schema.project.id, id), eq(schema.project.userId, userId)))
		.get();

	if (!row) {
		return c.json({ error: "Not found" }, 404);
	}

	await db
		.delete(schema.project)
		.where(eq(schema.project.id, id));

	return c.body(null, 204);
});

// ── Toggle routes ─────────────────────────────────────────────

async function getOwnedProject(db: ReturnType<typeof drizzle>, projectId: string, userId: string) {
	return db
		.select()
		.from(schema.project)
		.where(and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)))
		.get();
}

// GET /:projectId/toggles — list toggles for a project
projects.get("/:projectId/toggles", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) return c.json({ error: "Unauthorized" }, 401);

	const projectId = c.req.param("projectId");
	const db = drizzle(c.env.DB, { schema });

	const project = await getOwnedProject(db, projectId, userId);
	if (!project) return c.json({ error: "Not found" }, 404);

	const rows = await db
		.select()
		.from(schema.toggle)
		.where(eq(schema.toggle.projectId, projectId))
		.all();

	return c.json(rows);
});

// POST /:projectId/toggles — create a toggle
projects.post("/:projectId/toggles", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) return c.json({ error: "Unauthorized" }, 401);

	const projectId = c.req.param("projectId");
	const db = drizzle(c.env.DB, { schema });

	const project = await getOwnedProject(db, projectId, userId);
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

	const row = await db
		.select()
		.from(schema.toggle)
		.where(eq(schema.toggle.id, id))
		.get();

	return c.json(row, 201);
});

// PATCH /:projectId/toggles/:id — update enabled state
projects.patch("/:projectId/toggles/:id", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) return c.json({ error: "Unauthorized" }, 401);

	const projectId = c.req.param("projectId");
	const id = c.req.param("id");
	const db = drizzle(c.env.DB, { schema });

	const project = await getOwnedProject(db, projectId, userId);
	if (!project) return c.json({ error: "Not found" }, 404);

	const body = await c.req.json<{ enabled?: boolean }>();
	if (typeof body.enabled !== "boolean") {
		return c.json({ error: "enabled (boolean) is required" }, 400);
	}

	const now = new Date();
	await db
		.update(schema.toggle)
		.set({ enabled: body.enabled, updatedAt: now })
		.where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

	const row = await db
		.select()
		.from(schema.toggle)
		.where(eq(schema.toggle.id, id))
		.get();

	if (!row) return c.json({ error: "Not found" }, 404);
	return c.json(row);
});

// DELETE /:projectId/toggles/:id — delete a toggle
projects.delete("/:projectId/toggles/:id", async (c) => {
	const userId = c.get("user")?.id;
	if (!userId) return c.json({ error: "Unauthorized" }, 401);

	const projectId = c.req.param("projectId");
	const id = c.req.param("id");
	const db = drizzle(c.env.DB, { schema });

	const project = await getOwnedProject(db, projectId, userId);
	if (!project) return c.json({ error: "Not found" }, 404);

	await db
		.delete(schema.toggle)
		.where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

	return c.body(null, 204);
});
