import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";
import { canCreateQuoteInTrip } from "../../lib/plan-limits.js";

const createCotacaoBody = z.object({
  viagemId: z.string().min(1),
  tipo: z.enum(["hospedagem", "passagem_aerea", "terrestre", "passeio", "outro"]),
  fornecedor: z.string().min(1).max(250),
  periodoInicio: z.string().date().optional().nullable(),
  periodoFim: z.string().date().optional().nullable(),
  valorTotal: z.number().positive(),
  valorPorPessoa: z.number().nonnegative().optional().nullable(),
  link: z.string().url().optional().nullable(),
  notas: z.string().max(10_000).optional().nullable(),
  status: z.enum(["analise", "escolhido", "descartado"]).optional(),
});

const updateCotacaoBody = createCotacaoBody.partial().omit({ viagemId: true });

function toJsonCotacao(c: {
  id: string;
  viagemId: string;
  tipo: string;
  fornecedor: string;
  periodoInicio: Date | null;
  periodoFim: Date | null;
  valorTotal: unknown;
  valorPorPessoa: unknown;
  link: string | null;
  notas: string | null;
  status: string;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  return {
    id: c.id,
    viagemId: c.viagemId,
    tipo: c.tipo,
    fornecedor: c.fornecedor,
    periodoInicio: c.periodoInicio?.toISOString().slice(0, 10) ?? null,
    periodoFim: c.periodoFim?.toISOString().slice(0, 10) ?? null,
    valorTotal: Number(c.valorTotal),
    valorPorPessoa: c.valorPorPessoa != null ? Number(c.valorPorPessoa) : null,
    link: c.link,
    notas: c.notas,
    status: c.status,
    criadoEm: c.criadoEm.toISOString(),
    atualizadoEm: c.atualizadoEm.toISOString(),
  };
}

const cotacoesRoutes: FastifyPluginAsync = async (app) => {
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
        viagemId: z.string().min(1),
        tipo: z
          .enum(["hospedagem", "passagem_aerea", "terrestre", "passeio", "outro"])
          .optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: query.data.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const list = await prisma.cotacao.findMany({
      where: {
        viagemId: query.data.viagemId,
        ...(query.data.tipo ? { tipo: query.data.tipo } : {}),
      },
      orderBy: [{ tipo: "asc" }, { valorTotal: "asc" }, { atualizadoEm: "desc" }],
    });
    return sendData(reply, list.map(toJsonCotacao));
  });

  app.get("/comparativo", async (request, reply) => {
    const query = z
      .object({ viagemId: z.string().min(1), tipo: z.string().optional() })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: query.data.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const list = await prisma.cotacao.findMany({
      where: {
        viagemId: query.data.viagemId,
        ...(query.data.tipo ? { tipo: query.data.tipo as never } : {}),
      },
      orderBy: [{ tipo: "asc" }, { valorTotal: "asc" }],
    });
    const byType = list.reduce<Record<string, ReturnType<typeof toJsonCotacao>[]>>((acc, item) => {
      const key = item.tipo;
      if (!acc[key]) acc[key] = [];
      acc[key].push(toJsonCotacao(item));
      return acc;
    }, {});

    return sendData(reply, {
      viagemId: query.data.viagemId,
      totalCotacoes: list.length,
      comparativo: byType,
    });
  });

  app.post("/", async (request, reply) => {
    const parsed = createCotacaoBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");
    const limit = await canCreateQuoteInTrip(request.usuarioId!, body.viagemId);
    if (!limit.allowed) return sendError(reply, 403, limit.code, limit.message);

    const cotacao = await prisma.cotacao.create({
      data: {
        viagemId: body.viagemId,
        tipo: body.tipo,
        fornecedor: body.fornecedor,
        periodoInicio: body.periodoInicio ? new Date(body.periodoInicio) : undefined,
        periodoFim: body.periodoFim ? new Date(body.periodoFim) : undefined,
        valorTotal: body.valorTotal,
        valorPorPessoa: body.valorPorPessoa ?? undefined,
        link: body.link ?? undefined,
        notas: body.notas ?? undefined,
        status: body.status ?? "analise",
      },
    });
    return reply.status(201).send({ data: toJsonCotacao(cotacao) });
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCotacaoBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.cotacao.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Cotação não encontrada.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Cotação não encontrada.");

    const body = parsed.data;
    const cotacao = await prisma.cotacao.update({
      where: { id },
      data: {
        ...(body.tipo !== undefined && { tipo: body.tipo }),
        ...(body.fornecedor !== undefined && { fornecedor: body.fornecedor }),
        ...(body.periodoInicio !== undefined && {
          periodoInicio: body.periodoInicio ? new Date(body.periodoInicio) : null,
        }),
        ...(body.periodoFim !== undefined && {
          periodoFim: body.periodoFim ? new Date(body.periodoFim) : null,
        }),
        ...(body.valorTotal !== undefined && { valorTotal: body.valorTotal }),
        ...(body.valorPorPessoa !== undefined && { valorPorPessoa: body.valorPorPessoa }),
        ...(body.link !== undefined && { link: body.link }),
        ...(body.notas !== undefined && { notas: body.notas }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return sendData(reply, toJsonCotacao(cotacao));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.cotacao.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Cotação não encontrada.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Cotação não encontrada.");

    await prisma.cotacao.delete({ where: { id } });
    return reply.status(204).send();
  });
};

export default cotacoesRoutes;
