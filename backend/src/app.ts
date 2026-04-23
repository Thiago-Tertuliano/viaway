import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { clerkPlugin } from "@clerk/fastify";
import v1 from "./routes/v1/index.js";
import { prisma } from "./lib/prisma.js";
import { viawayOpenApi } from "./docs/openapi.js";

const disableAuth =
  process.env.DISABLE_AUTH === "true" &&
  process.env.NODE_ENV === "development";

const clerkReady = Boolean(
  process.env.CLERK_SECRET_KEY?.length &&
    process.env.CLERK_PUBLISHABLE_KEY?.length,
);

export async function buildServer() {
  if (!disableAuth && !clerkReady) {
    throw new Error(
      "Defina CLERK_SECRET_KEY e CLERK_PUBLISHABLE_KEY, ou DISABLE_AUTH=true em desenvolvimento (veja .env.example).",
    );
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

  if (!disableAuth && clerkReady) {
    await app.register(clerkPlugin, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    });
  }

  await app.register(v1, { prefix: "/v1" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

