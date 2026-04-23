import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";

const createGastoBody = z.object({
  viagemId: z.string().min(1),
  descricao: z.string().min(1).max(250),
  categoria: z.enum(["transporte", "hospedagem", "alimentacao", "passeio", "compras", "outro"]),
  valor: z.number().positive(),
  data: z.string().date(),
  comprovanteUrl: z.string().url().optional().nullable(),
  notas: z.string().max(10_000).optional().nullable(),
});

const updateGastoBody = createGastoBody.partial().omit({ viagemId: true });

function toJsonGasto(g: {
  id: string;
  viagemId: string;
  descricao: string;
  categoria: string;
  valor: unknown;
  data: Date;
  comprovanteUrl: string | null;
  notas: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  return {
    id: g.id,
    viagemId: g.viagemId,
    descricao: g.descricao,
    categoria: g.categoria,
    valor: Number(g.valor),
    data: g.data.toISOString().slice(0, 10),
    comprovanteUrl: g.comprovanteUrl,
    notas: g.notas,
    criadoEm: g.criadoEm.toISOString(),
    atualizadoEm: g.atualizadoEm.toISOString(),
  };
}

const gastosRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const usuarioId = await resolveUsuarioId(request);
    if (!usuarioId) {
      return sendError(reply, 401, "unauthorized", "Autenticação necessária.");
    }
    request.usuarioId = usuarioId;
  });

  app.get("/", async (request, reply) => {
    const query = z
      .object({ viagemId: z.string().min(1), categoria: z.string().optional() })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: query.data.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const list = await prisma.gasto.findMany({
      where: {
        viagemId: query.data.viagemId,
        ...(query.data.categoria ? { categoria: query.data.categoria as never } : {}),
      },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    });
    return sendData(reply, list.map(toJsonGasto));
  });

  app.post("/", async (request, reply) => {
    const parsed = createGastoBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const gasto = await prisma.gasto.create({
      data: {
        viagemId: body.viagemId,
        descricao: body.descricao,
        categoria: body.categoria,
        valor: body.valor,
        data: new Date(body.data),
        comprovanteUrl: body.comprovanteUrl ?? undefined,
        notas: body.notas ?? undefined,
      },
    });
    return reply.status(201).send({ data: toJsonGasto(gasto) });
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateGastoBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.gasto.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Gasto não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Gasto não encontrado.");

    const body = parsed.data;
    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        ...(body.descricao !== undefined && { descricao: body.descricao }),
        ...(body.categoria !== undefined && { categoria: body.categoria }),
        ...(body.valor !== undefined && { valor: body.valor }),
        ...(body.data !== undefined && { data: new Date(body.data) }),
        ...(body.comprovanteUrl !== undefined && { comprovanteUrl: body.comprovanteUrl }),
        ...(body.notas !== undefined && { notas: body.notas }),
      },
    });
    return sendData(reply, toJsonGasto(gasto));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.gasto.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Gasto não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Gasto não encontrado.");

    await prisma.gasto.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/painel", async (request, reply) => {
    const query = z.object({ viagemId: z.string().min(1) }).safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: query.data.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
      select: { id: true, orcamentoTotal: true, dataIda: true, dataVolta: true },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const [cotacoesEscolhidas, gastos] = await Promise.all([
      prisma.cotacao.aggregate({
        where: { viagemId: viagem.id, status: "escolhido" },
        _sum: { valorTotal: true },
      }),
      prisma.gasto.aggregate({
        where: { viagemId: viagem.id },
        _sum: { valor: true },
      }),
    ]);

    const orcamentoTotal = viagem.orcamentoTotal ? Number(viagem.orcamentoTotal) : 0;
    const somaCotacoes = cotacoesEscolhidas._sum.valorTotal
      ? Number(cotacoesEscolhidas._sum.valorTotal)
      : 0;
    const jaGasto = gastos._sum.valor ? Number(gastos._sum.valor) : 0;
    const comprometido = somaCotacoes + jaGasto;
    const saldoDisponivel = orcamentoTotal - comprometido;

    let custoEstimadoPorDia: number | null = null;
    if (viagem.dataIda && viagem.dataVolta) {
      const ms = viagem.dataVolta.getTime() - viagem.dataIda.getTime();
      const dias = Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
      custoEstimadoPorDia = Number((comprometido / dias).toFixed(2));
    }

    return sendData(reply, {
      viagemId: viagem.id,
      orcamentoTotal,
      cotacoesConfirmadas: somaCotacoes,
      jaGasto,
      saldoDisponivel: Number(saldoDisponivel.toFixed(2)),
      custoEstimadoPorDia,
    });
  });
};

export default gastosRoutes;
