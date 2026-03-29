import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, like } from "drizzle-orm";
import * as schema from "../db/schema";

export async function projectRoutes(fastify: FastifyInstance) {
  const db = fastify.db;

  // Helper to get owned project
  async function getOwnedProject(projectId: string, userId: string) {
    return db
      .select()
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)))
      .get();
  }

  // ── Project Routes ────────────────────────────────────────────

  // GET / — list projects
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const rows = await db
      .select()
      .from(schema.project)
      .where(eq(schema.project.userId, userId))
      .all();

    return reply.send(rows);
  });

  // POST / — create project
  fastify.post<{ Body: { name?: string } }>(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const { name } = request.body as { name?: string };
      if (!name?.trim()) {
        return reply.code(400).send({ error: "name is required" });
      }

      const now = new Date();
      const id = crypto.randomUUID();

      await db.insert(schema.project).values({
        id,
        userId,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      });

      const row = await db.select().from(schema.project).where(eq(schema.project.id, id)).get();

      return reply.code(201).send(row);
    },
  );

  // DELETE /:id — delete project
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const { id } = request.params as { id: string };

      const row = await db
        .select()
        .from(schema.project)
        .where(and(eq(schema.project.id, id), eq(schema.project.userId, userId)))
        .get();

      if (!row) {
        return reply.code(404).send({ error: "Not found" });
      }

      await db.delete(schema.project).where(eq(schema.project.id, id));

      return reply.code(204).send();
    },
  );

  // ── Toggle Routes ─────────────────────────────────────────────

  // GET /:projectId/toggles — list toggles
  fastify.get<{ Params: { projectId: string } }>(
    "/:projectId/toggles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { projectId } = request.params as { projectId: string };

      const project = await getOwnedProject(projectId, userId);
      if (!project) return reply.code(404).send({ error: "Not found" });

      const rows = await db
        .select()
        .from(schema.toggle)
        .where(eq(schema.toggle.projectId, projectId))
        .all();

      return reply.send(rows);
    },
  );

  // POST /:projectId/toggles — create toggle
  fastify.post<{ Params: { projectId: string }; Body: { key?: string; enabled?: boolean } }>(
    "/:projectId/toggles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { projectId } = request.params as { projectId: string };
      const { key, enabled } = request.body as { key?: string; enabled?: boolean };

      const project = await getOwnedProject(projectId, userId);
      if (!project) return reply.code(404).send({ error: "Not found" });

      if (!key?.trim()) return reply.code(400).send({ error: "key is required" });

      const now = new Date();
      const id = crypto.randomUUID();

      await db.insert(schema.toggle).values({
        id,
        projectId,
        key: key.trim(),
        enabled: enabled ?? false,
        createdAt: now,
        updatedAt: now,
      });

      const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();

      return reply.code(201).send(row);
    },
  );

  // PATCH /:projectId/toggles/:id — update toggle
  fastify.patch<{ Params: { projectId: string; id: string }; Body: { enabled?: boolean } }>(
    "/:projectId/toggles/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { projectId, id } = request.params as { projectId: string; id: string };
      const { enabled } = request.body as { enabled?: boolean };

      const project = await getOwnedProject(projectId, userId);
      if (!project) return reply.code(404).send({ error: "Not found" });

      if (typeof enabled !== "boolean") {
        return reply.code(400).send({ error: "enabled (boolean) is required" });
      }

      const now = new Date();
      await db
        .update(schema.toggle)
        .set({ enabled, updatedAt: now })
        .where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

      const row = await db.select().from(schema.toggle).where(eq(schema.toggle.id, id)).get();

      if (!row) return reply.code(404).send({ error: "Not found" });
      return reply.send(row);
    },
  );

  // GET /:projectId/toggles/one — get single toggle
  fastify.get<{ Params: { projectId: string }; Querystring: { pattern?: string; flag?: string } }>(
    "/:projectId/toggles/one",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { projectId } = request.params as { projectId: string };
      const { pattern, flag } = request.query as { pattern?: string; flag?: string };

      if (!pattern && !flag) {
        return reply.code(400).send({ error: "Need pattern / key query to get a toggle" });
      }

      const project = await getOwnedProject(projectId, userId);
      if (!project) return reply.code(404).send({ error: "Not found" });

      const query = db.select().from(schema.toggle);

      if (pattern) {
        const normalizedPattern = `%${String(pattern).replace(/[-_ ]/g, "%")}%`;
        const rows = await query.where(like(schema.toggle.key, normalizedPattern)).limit(1).all();
        return reply.send(rows.at(-1) ?? {});
      }

      const rows = await query
        .where(eq(schema.toggle.key, flag as string))
        .limit(1)
        .all();
      return reply.send(rows.at(-1) ?? {});
    },
  );

  // DELETE /:projectId/toggles/:id — delete toggle
  fastify.delete<{ Params: { projectId: string; id: string } }>(
    "/:projectId/toggles/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { projectId, id } = request.params as { projectId: string; id: string };

      const project = await getOwnedProject(projectId, userId);
      if (!project) return reply.code(404).send({ error: "Not found" });

      await db
        .delete(schema.toggle)
        .where(and(eq(schema.toggle.id, id), eq(schema.toggle.projectId, projectId)));

      return reply.code(204).send();
    },
  );
}
