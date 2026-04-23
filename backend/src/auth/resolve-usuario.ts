import { createClerkClient } from "@clerk/backend";
import type { FastifyRequest } from "fastify";
import { getAuth } from "@clerk/fastify";
import { prisma } from "../lib/prisma.js";

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

export async function resolveUsuarioId(request: FastifyRequest): Promise<string | null> {
  if (
    process.env.DISABLE_AUTH === "true" &&
    process.env.NODE_ENV === "development"
  ) {
    const clerkId = process.env.DEV_CLERK_ID ?? "user_dev_local";
    const email = process.env.DEV_USER_EMAIL ?? "dev@local.test";
    const nome = process.env.DEV_USER_NOME ?? "Dev Local";

    const u = await prisma.usuario.upsert({
      where: { clerkId },
      create: { clerkId, email, nome },
      update: { ultimoAcesso: new Date() },
    });
    return u.id;
  }

  const { userId } = getAuth(request);
  if (!userId) return null;

  let usuario = await prisma.usuario.findUnique({
    where: { clerkId: userId },
  });

  if (!usuario && clerk) {
    const u = await clerk.users.getUser(userId);
    const email =
      u.emailAddresses.find((e: { id: string }) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ?? u.emailAddresses[0]?.emailAddress;
    const nome =
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
      email ||
      "Usuário";
    if (!email) return null;

    usuario = await prisma.usuario.create({
      data: {
        clerkId: userId,
        email,
        nome,
        fotoUrl: u.imageUrl ?? undefined,
      },
    });
  }

  if (!usuario) return null;

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcesso: new Date() },
  });

  return usuario.id;
}
