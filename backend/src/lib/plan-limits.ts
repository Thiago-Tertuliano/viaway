import { StatusViagem } from "@prisma/client";
import { prisma } from "./prisma.js";

export const FREE_LIMITS = {
  activeTrips: 3,
  placesPerTrip: 20,
  quotesPerTrip: 10,
} as const;

export async function getUsuarioPlano(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { plano: true },
  });
  return usuario?.plano ?? "free";
}

export async function canCreateActiveTrip(usuarioId: string) {
  const plano = await getUsuarioPlano(usuarioId);
  if (plano !== "free") return { allowed: true as const };

  const ativas = await prisma.viagem.count({
    where: {
      usuarioId,
      deletadoEm: null,
      status: { not: StatusViagem.concluida },
    },
  });
  if (ativas >= FREE_LIMITS.activeTrips) {
    return {
      allowed: false as const,
      code: "limit_reached",
      message: `Limite de ${FREE_LIMITS.activeTrips} viagens ativas no plano Free.`,
    };
  }
  return { allowed: true as const };
}

export async function canCreatePlaceInTrip(usuarioId: string, viagemId: string) {
  const plano = await getUsuarioPlano(usuarioId);
  if (plano !== "free") return { allowed: true as const };

  const count = await prisma.lugar.count({
    where: { usuarioId, viagemId, deletadoEm: null },
  });
  if (count >= FREE_LIMITS.placesPerTrip) {
    return {
      allowed: false as const,
      code: "limit_reached",
      message: `Limite de ${FREE_LIMITS.placesPerTrip} lugares por viagem no plano Free.`,
    };
  }
  return { allowed: true as const };
}

export async function canCreateQuoteInTrip(usuarioId: string, viagemId: string) {
  const plano = await getUsuarioPlano(usuarioId);
  if (plano !== "free") return { allowed: true as const };

  const viagem = await prisma.viagem.findFirst({
    where: { id: viagemId, usuarioId, deletadoEm: null },
    select: { id: true },
  });
  if (!viagem) {
    return {
      allowed: false as const,
      code: "not_found",
      message: "Viagem não encontrada.",
    };
  }

  const count = await prisma.cotacao.count({ where: { viagemId } });
  if (count >= FREE_LIMITS.quotesPerTrip) {
    return {
      allowed: false as const,
      code: "limit_reached",
      message: `Limite de ${FREE_LIMITS.quotesPerTrip} cotações por viagem no plano Free.`,
    };
  }
  return { allowed: true as const };
}
