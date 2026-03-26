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
