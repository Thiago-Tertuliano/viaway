import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { StatusViagem } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";
import { canCreateActiveTrip } from "../../lib/plan-limits.js";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

const postViagemBody = z.object({
  nome: z.string().min(1).max(200),
  destinoPrincipal: z.string().min(1).max(300),
  destinosSecundarios: z.array(z.string()).optional().default([]),
  dataIda: z.string().optional().nullable(),
  dataVolta: z.string().optional().nullable(),
  numViajantes: z.number().int().min(1).max(50).optional().default(1),
  orcamentoTotal: z.number().nonnegative().optional().nullable(),
  notas: z.string().max(10_000).optional().nullable(),
});

const putViagemBody = postViagemBody.partial();
const listViagensQuery = z.object({
  status: z.nativeEnum(StatusViagem).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE_MAX)
    .optional()
    .default(PAGE_SIZE_DEFAULT),
});

function isDateInTripWindow(
  dataIda: Date | null,
  dataVolta: Date | null,
  now = new Date(),
) {
  if (!dataIda || !dataVolta) return false;
  const start = new Date(dataIda);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dataVolta);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

function toJsonViagem(v: {
  id: string;
  nome: string;
  destinoPrincipal: string;
  destinosSecundarios: unknown;
  dataIda: Date | null;
  dataVolta: Date | null;
  numViajantes: number;
  capaUrl: string | null;
  status: StatusViagem;
  orcamentoTotal: unknown;
  notas: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}) {
  return {
    id: v.id,
    nome: v.nome,
    destinoPrincipal: v.destinoPrincipal,
    destinosSecundarios: v.destinosSecundarios,
    dataIda: v.dataIda?.toISOString().slice(0, 10) ?? null,
    dataVolta: v.dataVolta?.toISOString().slice(0, 10) ?? null,
    numViajantes: v.numViajantes,
    capaUrl: v.capaUrl,
    status: v.status,
    orcamentoTotal:
      v.orcamentoTotal != null ? Number(v.orcamentoTotal) : null,
    notas: v.notas,
    criadoEm: v.criadoEm.toISOString(),
    atualizadoEm: v.atualizadoEm.toISOString(),
  };
}

const viagensRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const usuarioId = await resolveUsuarioId(request);
    if (!usuarioId) {
      return sendError(reply, 401, "unauthorized", "Autenticação necessária.");
    }
    request.usuarioId = usuarioId;
  });

  app.get("/", async (request, reply) => {
    const parsed = listViagensQuery.safeParse(request.query);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        "validation_error",
        "Query inválida.",
        parsed.error.flatten(),
      );
    }
    const query = parsed.data;

    const where = {
      usuarioId: request.usuarioId!,
      deletadoEm: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await prisma.viagem.count({ where });
    const listRaw = await prisma.viagem.findMany({
      where,
      orderBy: [{ atualizadoEm: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    const list = listRaw
      .map((v) => {
        const emAndamento = isDateInTripWindow(v.dataIda, v.dataVolta);
        return {
          ...toJsonViagem(v),
          destaqueEmAndamento: emAndamento,
        };
      })
      .sort((a, b) => Number(b.destaqueEmAndamento) - Number(a.destaqueEmAndamento));

    return sendData(reply, list, {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  });

  app.post("/", async (request, reply) => {
    const parsed = postViagemBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;

    const limit = await canCreateActiveTrip(request.usuarioId!);
    if (!limit.allowed) {
      return sendError(reply, 403, limit.code, limit.message);
    }

    const v = await prisma.viagem.create({
      data: {
        usuarioId: request.usuarioId!,
        nome: body.nome,
        destinoPrincipal: body.destinoPrincipal,
        destinosSecundarios: body.destinosSecundarios,
        dataIda: body.dataIda ? new Date(body.dataIda) : null,
        dataVolta: body.dataVolta ? new Date(body.dataVolta) : null,
        numViajantes: body.numViajantes,
        orcamentoTotal: body.orcamentoTotal ?? undefined,
        notas: body.notas ?? undefined,
      },
    });

    return reply.status(201).send({ data: toJsonViagem(v) });
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const v = await prisma.viagem.findFirst({
      where: { id, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!v) {
      return sendError(reply, 404, "not_found", "Viagem não encontrada.");
    }
    return sendData(reply, toJsonViagem(v));
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = putViagemBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;

    const existing = await prisma.viagem.findFirst({
      where: { id, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!existing) {
      return sendError(reply, 404, "not_found", "Viagem não encontrada.");
    }

    const v = await prisma.viagem.update({
      where: { id },
      data: {
        ...(body.nome !== undefined && { nome: body.nome }),
        ...(body.destinoPrincipal !== undefined && {
          destinoPrincipal: body.destinoPrincipal,
        }),
        ...(body.destinosSecundarios !== undefined && {
          destinosSecundarios: body.destinosSecundarios,
        }),
        ...(body.dataIda !== undefined && {
          dataIda: body.dataIda ? new Date(body.dataIda) : null,
        }),
        ...(body.dataVolta !== undefined && {
          dataVolta: body.dataVolta ? new Date(body.dataVolta) : null,
        }),
        ...(body.numViajantes !== undefined && {
          numViajantes: body.numViajantes,
        }),
        ...(body.orcamentoTotal !== undefined && {
          orcamentoTotal: body.orcamentoTotal ?? undefined,
        }),
        ...(body.notas !== undefined && { notas: body.notas }),
      },
    });

    return sendData(reply, toJsonViagem(v));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.viagem.findFirst({
      where: { id, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!existing) {
      return sendError(reply, 404, "not_found", "Viagem não encontrada.");
    }

    await prisma.viagem.update({
      where: { id },
      data: { deletadoEm: new Date() },
    });

    return reply.status(204).send();
  });
};

export default viagensRoutes;
