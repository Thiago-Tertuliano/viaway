import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_request, reply) => {
    return reply.send({ data: { ok: true, service: "viaway-api" } });
  });
};

export default healthRoutes;
