import type { FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getUsuarioIdIfValidAccessToken } from "./bearer-access.js";

export async function resolveUsuarioId(request: FastifyRequest): Promise<string | null> {
  if (
    process.env.DISABLE_AUTH === "true" &&
    process.env.NODE_ENV === "development"
  ) {
    const email = process.env.DEV_USER_EMAIL ?? "dev@local.test";
    const nome = process.env.DEV_USER_NOME ?? "Dev Local";

    let usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email,
          nome,
        },
      });
    }
    return usuario.id;
  }

  const usuarioId = await getUsuarioIdIfValidAccessToken(request.headers.authorization);
  if (!usuarioId) {
    return null;
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { ultimoAcesso: new Date() },
  });

  return usuarioId;
}
