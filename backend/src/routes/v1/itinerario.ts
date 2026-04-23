import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";

const createDiaBody = z.object({
  viagemId: z.string().min(1),
  data: z.string().date(),
  ordem: z.number().int().min(1),
  resumoDia: z.string().max(10_000).optional().nullable(),
});

const updateDiaBody = createDiaBody.partial().omit({ viagemId: true });

const createAtividadeBody = z.object({
  diaId: z.string().min(1),
  viagemId: z.string().min(1),
  lugarId: z.string().min(1).optional().nullable(),
  tipo: z
    .enum(["atividade", "refeicao", "transporte", "hospedagem", "livre"])
    .optional(),
  nome: z.string().min(1).max(300),
  horarioInicio: z.string().optional().nullable(),
  horarioFim: z.string().optional().nullable(),
  duracaoMin: z.number().int().min(0).optional().nullable(),
  custoEstimado: z.number().nonnegative().optional().nullable(),
  notas: z.string().max(10_000).optional().nullable(),
  status: z.enum(["pendente", "confirmado", "concluido"]).optional(),
  ordem: z.number().int().min(1),
});

const updateAtividadeBody = createAtividadeBody
  .partial()
  .omit({ diaId: true, viagemId: true });

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}Z`);
}

function toJsonDia(d: {
  id: string;
  viagemId: string;
  data: Date;
  ordem: number;
  resumoDia: string | null;
  criadoEm: Date;
}) {
  return {
    id: d.id,
    viagemId: d.viagemId,
    data: d.data.toISOString().slice(0, 10),
    ordem: d.ordem,
    resumoDia: d.resumoDia,
    criadoEm: d.criadoEm.toISOString(),
  };
}

function toJsonAtividade(a: {
  id: string;
  diaId: string;
  viagemId: string;
  lugarId: string | null;
  tipo: string;
  nome: string;
  horarioInicio: Date | null;
  horarioFim: Date | null;
  duracaoMin: number | null;
  custoEstimado: unknown;
  notas: string | null;
  status: string;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  const toTime = (v: Date | null) => (v ? v.toISOString().slice(11, 16) : null);
  return {
    id: a.id,
    diaId: a.diaId,
    viagemId: a.viagemId,
    lugarId: a.lugarId,
    tipo: a.tipo,
    nome: a.nome,
    horarioInicio: toTime(a.horarioInicio),
    horarioFim: toTime(a.horarioFim),
    duracaoMin: a.duracaoMin,
    custoEstimado: a.custoEstimado != null ? Number(a.custoEstimado) : null,
    notas: a.notas,
    status: a.status,
    ordem: a.ordem,
    criadoEm: a.criadoEm.toISOString(),
    atualizadoEm: a.atualizadoEm.toISOString(),
  };
}

const itinerarioRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const usuarioId = await resolveUsuarioId(request);
    if (!usuarioId) {
      return sendError(reply, 401, "unauthorized", "Autenticação necessária.");
    }
    request.usuarioId = usuarioId;
  });

  app.get("/dias", async (request, reply) => {
    const query = z
      .object({ viagemId: z.string().min(1) })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: {
        id: query.data.viagemId,
        usuarioId: request.usuarioId!,
        deletadoEm: null,
      },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const dias = await prisma.itinerarioDia.findMany({
      where: { viagemId: viagem.id },
      orderBy: [{ ordem: "asc" }, { data: "asc" }],
    });
    return sendData(reply, dias.map(toJsonDia));
  });

  app.post("/dias", async (request, reply) => {
    const parsed = createDiaBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const dia = await prisma.itinerarioDia.create({
      data: {
        viagemId: body.viagemId,
        data: new Date(body.data),
        ordem: body.ordem,
        resumoDia: body.resumoDia ?? undefined,
      },
    });
    return reply.status(201).send({ data: toJsonDia(dia) });
  });

  app.put("/dias/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateDiaBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.itinerarioDia.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Dia não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Dia não encontrado.");

    const body = parsed.data;
    const dia = await prisma.itinerarioDia.update({
      where: { id },
      data: {
        ...(body.data !== undefined && { data: new Date(body.data) }),
        ...(body.ordem !== undefined && { ordem: body.ordem }),
        ...(body.resumoDia !== undefined && { resumoDia: body.resumoDia }),
      },
    });
    return sendData(reply, toJsonDia(dia));
  });

  app.delete("/dias/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.itinerarioDia.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Dia não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Dia não encontrado.");

    await prisma.itinerarioDia.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/atividades", async (request, reply) => {
    const query = z
      .object({ diaId: z.string().min(1) })
      .safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const dia = await prisma.itinerarioDia.findUnique({ where: { id: query.data.diaId } });
    if (!dia) return sendError(reply, 404, "not_found", "Dia não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: dia.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Dia não encontrado.");

    const atividades = await prisma.atividade.findMany({
      where: { diaId: dia.id },
      orderBy: { ordem: "asc" },
    });
    return sendData(reply, atividades.map(toJsonAtividade));
  });

  app.post("/atividades", async (request, reply) => {
    const parsed = createAtividadeBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");
    const dia = await prisma.itinerarioDia.findFirst({
      where: { id: body.diaId, viagemId: body.viagemId },
    });
    if (!dia) return sendError(reply, 404, "not_found", "Dia não encontrado.");

    const atividade = await prisma.atividade.create({
      data: {
        diaId: body.diaId,
        viagemId: body.viagemId,
        lugarId: body.lugarId ?? undefined,
        tipo: body.tipo ?? "atividade",
        nome: body.nome,
        horarioInicio: parseTime(body.horarioInicio),
        horarioFim: parseTime(body.horarioFim),
        duracaoMin: body.duracaoMin ?? undefined,
        custoEstimado: body.custoEstimado ?? undefined,
        notas: body.notas ?? undefined,
        status: body.status ?? "pendente",
        ordem: body.ordem,
      },
    });
    return reply.status(201).send({ data: toJsonAtividade(atividade) });
  });

  app.put("/atividades/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateAtividadeBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.atividade.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Atividade não encontrada.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Atividade não encontrada.");

    const body = parsed.data;
    const atividade = await prisma.atividade.update({
      where: { id },
      data: {
        ...(body.lugarId !== undefined && { lugarId: body.lugarId }),
        ...(body.tipo !== undefined && { tipo: body.tipo }),
        ...(body.nome !== undefined && { nome: body.nome }),
        ...(body.horarioInicio !== undefined && {
          horarioInicio: parseTime(body.horarioInicio),
        }),
        ...(body.horarioFim !== undefined && { horarioFim: parseTime(body.horarioFim) }),
        ...(body.duracaoMin !== undefined && { duracaoMin: body.duracaoMin }),
        ...(body.custoEstimado !== undefined && { custoEstimado: body.custoEstimado }),
        ...(body.notas !== undefined && { notas: body.notas }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.ordem !== undefined && { ordem: body.ordem }),
      },
    });
    return sendData(reply, toJsonAtividade(atividade));
  });

  app.delete("/atividades/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.atividade.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Atividade não encontrada.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Atividade não encontrada.");

    await prisma.atividade.delete({ where: { id } });
    return reply.status(204).send();
  });
};

export default itinerarioRoutes;
