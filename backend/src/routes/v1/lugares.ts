import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";
import { canCreatePlaceInTrip } from "../../lib/plan-limits.js";

const createLugarBody = z.object({
  viagemId: z.string().min(1).optional().nullable(),
  nome: z.string().min(1).max(200),
  tipo: z
    .enum(["restaurante", "hotel", "ponto_turistico", "praia", "museu", "bar", "outro"])
    .optional(),
  cidade: z.string().max(120).optional().nullable(),
  estado: z.string().max(120).optional().nullable(),
  pais: z.string().max(120).optional().nullable(),
  endereco: z.string().max(300).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  notaPessoal: z.string().max(10_000).optional().nullable(),
  status: z.enum(["quero_ir", "ja_fui", "descartado"]).optional(),
  tags: z.array(z.string()).optional().default([]),
});

const updateLugarBody = createLugarBody.partial();

function toJsonLugar(l: {
  id: string;
  usuarioId: string;
  viagemId: string | null;
  nome: string;
  tipo: string;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
  notaPessoal: string | null;
  status: string;
  tags: unknown;
  fonte: string;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  return {
    id: l.id,
    usuarioId: l.usuarioId,
    viagemId: l.viagemId,
    nome: l.nome,
    tipo: l.tipo,
    cidade: l.cidade,
    estado: l.estado,
    pais: l.pais,
    endereco: l.endereco,
    lat: l.lat,
    lng: l.lng,
    notaPessoal: l.notaPessoal,
    status: l.status,
    tags: l.tags,
    fonte: l.fonte,
    criadoEm: l.criadoEm.toISOString(),
    atualizadoEm: l.atualizadoEm.toISOString(),
  };
}

const lugaresRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const usuarioId = await resolveUsuarioId(request);
    if (!usuarioId) {
      return sendError(reply, 401, "unauthorized", "Autenticação necessária.");
    }
    request.usuarioId = usuarioId;
  });

  app.get("/", async (request, reply) => {
    const query = z
      .object({
        viagemId: z.string().min(1).optional(),
        status: z.enum(["quero_ir", "ja_fui", "descartado"]).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const list = await prisma.lugar.findMany({
      where: {
        usuarioId: request.usuarioId!,
        deletadoEm: null,
        ...(query.data.viagemId ? { viagemId: query.data.viagemId } : {}),
        ...(query.data.status ? { status: query.data.status } : {}),
      },
      orderBy: { atualizadoEm: "desc" },
    });
    return sendData(reply, list.map(toJsonLugar));
  });

  app.post("/", async (request, reply) => {
    const parsed = createLugarBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;

    if (body.viagemId) {
      const viagem = await prisma.viagem.findFirst({
        where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
      });
      if (!viagem) {
        return sendError(reply, 404, "not_found", "Viagem não encontrada.");
      }
      const limit = await canCreatePlaceInTrip(request.usuarioId!, body.viagemId);
      if (!limit.allowed) {
        return sendError(reply, 403, limit.code, limit.message);
      }
    }

    const lugar = await prisma.lugar.create({
      data: {
        usuarioId: request.usuarioId!,
        viagemId: body.viagemId ?? undefined,
        nome: body.nome,
        tipo: body.tipo ?? "outro",
        cidade: body.cidade ?? undefined,
        estado: body.estado ?? undefined,
        pais: body.pais ?? undefined,
        endereco: body.endereco ?? undefined,
        lat: body.lat ?? undefined,
        lng: body.lng ?? undefined,
        notaPessoal: body.notaPessoal ?? undefined,
        status: body.status ?? "quero_ir",
        tags: body.tags,
      },
    });
    return reply.status(201).send({ data: toJsonLugar(lugar) });
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateLugarBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }

    const existing = await prisma.lugar.findFirst({
      where: { id, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!existing) return sendError(reply, 404, "not_found", "Lugar não encontrado.");

    const body = parsed.data;
    if (body.viagemId) {
      const viagem = await prisma.viagem.findFirst({
        where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
      });
      if (!viagem) {
        return sendError(reply, 404, "not_found", "Viagem não encontrada.");
      }
      if (existing.viagemId !== body.viagemId) {
        const limit = await canCreatePlaceInTrip(request.usuarioId!, body.viagemId);
        if (!limit.allowed) {
          return sendError(reply, 403, limit.code, limit.message);
        }
      }
    }

    const lugar = await prisma.lugar.update({
      where: { id },
      data: {
        ...(body.viagemId !== undefined && { viagemId: body.viagemId }),
        ...(body.nome !== undefined && { nome: body.nome }),
        ...(body.tipo !== undefined && { tipo: body.tipo }),
        ...(body.cidade !== undefined && { cidade: body.cidade }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.pais !== undefined && { pais: body.pais }),
        ...(body.endereco !== undefined && { endereco: body.endereco }),
        ...(body.lat !== undefined && { lat: body.lat }),
        ...(body.lng !== undefined && { lng: body.lng }),
        ...(body.notaPessoal !== undefined && { notaPessoal: body.notaPessoal }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });
    return sendData(reply, toJsonLugar(lugar));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.lugar.findFirst({
      where: { id, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!existing) return sendError(reply, 404, "not_found", "Lugar não encontrado.");

    const vinculos = await prisma.atividade.count({ where: { lugarId: id } });
    if (vinculos > 0) {
      return sendError(
        reply,
        409,
        "conflict",
        "Lugar vinculado a atividades. Desvincule antes de excluir.",
      );
    }

    await prisma.lugar.update({
      where: { id },
      data: { deletadoEm: new Date() },
    });
    return reply.status(204).send();
  });
};

export default lugaresRoutes;
