import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const plan = await getUserPlan(fastify.db, userId);
    const limits = PLAN_LIMITS[plan];

    return reply.send({ plan, limits });
  });
}
