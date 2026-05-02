import { prisma } from "../lib/prisma.js";
import { verifyAccessTokenString } from "./tokens.js";

/**
 * Valida Bearer access JWT (tipo access, segredo correto, usuário ativo, tokenVersao).
 */
export async function getUsuarioIdIfValidAccessToken(
  authorization: string | undefined,
): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const payload = verifyAccessTokenString(authorization.slice(7));
  if (!payload) return null;

  const usuario = await prisma.usuario.findFirst({
    where: { id: payload.sub, deletadoEm: null },
    select: { id: true, tokenVersao: true },
  });
  if (!usuario || usuario.tokenVersao !== payload.v) return null;
  return usuario.id;
}
