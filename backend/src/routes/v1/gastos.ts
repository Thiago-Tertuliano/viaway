import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";
import { convertCurrency } from "../../lib/fx.js";

const createGastoBody = z.object({
  viagemId: z.string().min(1),
  descricao: z.string().min(1).max(250),
  categoria: z.enum(["transporte", "hospedagem", "alimentacao", "passeio", "compras", "outro"]),
  descricaoPagamento: z.string().max(300).optional().nullable(),
  metodoPagamento: z
    .enum(["cartao_internacional", "cartao_nacional", "pix", "dinheiro", "transferencia", "outro"])
    .optional(),
  cartaoNome: z.string().max(120).optional().nullable(),
  parcelas: z.number().int().min(1).max(24).optional().nullable(),
  moeda: z.string().length(3).optional(),
  valorOriginal: z.number().positive().optional().nullable(),
  cotacaoMoeda: z.number().positive().optional().nullable(),
  valorConvertido: z.number().positive().optional().nullable(),
  iofPercentual: z.number().min(0).max(100).optional().nullable(),
  taxaPercentual: z.number().min(0).max(100).optional().nullable(),
  milhasEstimadas: z.number().int().min(0).optional().nullable(),
  valor: z.number().positive().optional(),
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
  descricaoPagamento: string | null;
  metodoPagamento: string;
  cartaoNome: string | null;
  parcelas: number | null;
  moeda: string;
  valorOriginal: unknown;
  cotacaoMoeda: unknown;
  valorConvertido: unknown;
  iofPercentual: unknown;
  taxaPercentual: unknown;
  milhasEstimadas: number | null;
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
    descricaoPagamento: g.descricaoPagamento,
    metodoPagamento: g.metodoPagamento,
    cartaoNome: g.cartaoNome,
    parcelas: g.parcelas,
    moeda: g.moeda,
    valorOriginal: g.valorOriginal != null ? Number(g.valorOriginal) : null,
    cotacaoMoeda: g.cotacaoMoeda != null ? Number(g.cotacaoMoeda) : null,
    valorConvertido: g.valorConvertido != null ? Number(g.valorConvertido) : null,
    iofPercentual: g.iofPercentual != null ? Number(g.iofPercentual) : null,
    taxaPercentual: g.taxaPercentual != null ? Number(g.taxaPercentual) : null,
    milhasEstimadas: g.milhasEstimadas,
    valor: Number(g.valor),
    data: g.data.toISOString().slice(0, 10),
    comprovanteUrl: g.comprovanteUrl,
    notas: g.notas,
    criadoEm: g.criadoEm.toISOString(),
    atualizadoEm: g.atualizadoEm.toISOString(),
  };
}

const gastosRoutes: FastifyPluginAsync = async (app) => {
  const resolveValorFinal = async (body: z.infer<typeof createGastoBody>) => {
    if (body.valor && body.valor > 0) {
      return { valorFinal: body.valor, valorConvertido: body.valorConvertido ?? body.valor };
    }
    if (!body.valorOriginal || body.valorOriginal <= 0) return null;

    const moeda = (body.moeda ?? "BRL").toUpperCase();
    if (moeda === "BRL") {
      const base = body.valorOriginal;
      const iof = body.iofPercentual ?? 0;
      const taxa = body.taxaPercentual ?? 0;
      return {
        valorFinal: Number((base * (1 + iof / 100 + taxa / 100)).toFixed(2)),
        valorConvertido: base,
      };
    }

    const taxaConversao =
      body.cotacaoMoeda ??
      (await convertCurrency({
        from: moeda,
        to: "BRL",
        amount: 1,
      }))?.rate;
    if (!taxaConversao) return null;

    const converted = body.valorOriginal * taxaConversao;
    const iof = body.iofPercentual ?? 0;
    const taxa = body.taxaPercentual ?? 0;
    const total = converted * (1 + iof / 100 + taxa / 100);

    return {
      valorFinal: Number(total.toFixed(2)),
      valorConvertido: Number(converted.toFixed(2)),
    };
  };

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
    const valores = await resolveValorFinal(body);
    if (!valores) {
      return sendError(
        reply,
        422,
        "invalid_amount",
        "Informe valor em BRL ou valor original com moeda/cotação válida.",
      );
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const gasto = await prisma.gasto.create({
      data: {
        viagemId: body.viagemId,
        descricao: body.descricao,
        categoria: body.categoria,
        descricaoPagamento: body.descricaoPagamento ?? undefined,
        metodoPagamento: body.metodoPagamento ?? "outro",
        cartaoNome: body.cartaoNome ?? undefined,
        parcelas: body.parcelas ?? undefined,
        moeda: (body.moeda ?? "BRL").toUpperCase(),
        valorOriginal: body.valorOriginal ?? undefined,
        cotacaoMoeda: body.cotacaoMoeda ?? undefined,
        valorConvertido: body.valorConvertido ?? valores.valorConvertido,
        iofPercentual: body.iofPercentual ?? undefined,
        taxaPercentual: body.taxaPercentual ?? undefined,
        milhasEstimadas: body.milhasEstimadas ?? undefined,
        valor: valores.valorFinal,
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
    const valores = await resolveValorFinal({
      viagemId: existing.viagemId,
      descricao: body.descricao ?? existing.descricao,
      categoria: body.categoria ?? existing.categoria,
      descricaoPagamento: body.descricaoPagamento ?? existing.descricaoPagamento,
      metodoPagamento: body.metodoPagamento ?? existing.metodoPagamento,
      cartaoNome: body.cartaoNome ?? existing.cartaoNome,
      parcelas: body.parcelas ?? existing.parcelas,
      moeda: body.moeda ?? existing.moeda,
      valorOriginal:
        body.valorOriginal ?? (existing.valorOriginal != null ? Number(existing.valorOriginal) : null),
      cotacaoMoeda: body.cotacaoMoeda ?? (existing.cotacaoMoeda != null ? Number(existing.cotacaoMoeda) : null),
      valorConvertido:
        body.valorConvertido ?? (existing.valorConvertido != null ? Number(existing.valorConvertido) : null),
      iofPercentual: body.iofPercentual ?? (existing.iofPercentual != null ? Number(existing.iofPercentual) : null),
      taxaPercentual:
        body.taxaPercentual ?? (existing.taxaPercentual != null ? Number(existing.taxaPercentual) : null),
      milhasEstimadas: body.milhasEstimadas ?? existing.milhasEstimadas,
      valor: body.valor ?? Number(existing.valor),
      data: body.data ?? existing.data.toISOString().slice(0, 10),
      comprovanteUrl: body.comprovanteUrl ?? existing.comprovanteUrl,
      notas: body.notas ?? existing.notas,
    });
    if (!valores) {
      return sendError(
        reply,
        422,
        "invalid_amount",
        "Informe valor em BRL ou valor original com moeda/cotação válida.",
      );
    }
    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        ...(body.descricao !== undefined && { descricao: body.descricao }),
        ...(body.categoria !== undefined && { categoria: body.categoria }),
        ...(body.descricaoPagamento !== undefined && { descricaoPagamento: body.descricaoPagamento }),
        ...(body.metodoPagamento !== undefined && { metodoPagamento: body.metodoPagamento }),
        ...(body.cartaoNome !== undefined && { cartaoNome: body.cartaoNome }),
        ...(body.parcelas !== undefined && { parcelas: body.parcelas }),
        ...(body.moeda !== undefined && { moeda: body.moeda.toUpperCase() }),
        ...(body.valorOriginal !== undefined && { valorOriginal: body.valorOriginal }),
        ...(body.cotacaoMoeda !== undefined && { cotacaoMoeda: body.cotacaoMoeda }),
        ...(body.valorConvertido !== undefined && { valorConvertido: body.valorConvertido }),
        ...(body.iofPercentual !== undefined && { iofPercentual: body.iofPercentual }),
        ...(body.taxaPercentual !== undefined && { taxaPercentual: body.taxaPercentual }),
        ...(body.milhasEstimadas !== undefined && { milhasEstimadas: body.milhasEstimadas }),
        ...(body.valor !== undefined && { valor: valores.valorFinal }),
        ...(body.valor === undefined && { valor: valores.valorFinal }),
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
