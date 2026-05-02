import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import v1 from "./routes/v1/index.js";
import { prisma } from "./lib/prisma.js";
import { viawayOpenApi } from "./docs/openapi.js";
import { assertJwtSecretsConfigured } from "./auth/tokens.js";

const disableAuth =
  process.env.DISABLE_AUTH === "true" &&
  process.env.NODE_ENV === "development";

export async function buildServer() {
  if (!disableAuth) {
    assertJwtSecretsConfigured();
  }

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "ViaWay API",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/v1/docs",
    staticCSP: true,
    transformSpecification: () => viawayOpenApi,
  });

  app.get("/v1/docs/openapi.json", async () => viawayOpenApi);

  await app.register(v1, { prefix: "/v1" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
