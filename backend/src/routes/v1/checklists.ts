import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { resolveUsuarioId } from "../../auth/resolve-usuario.js";

const createChecklistBody = z.object({
  viagemId: z.string().min(1),
  item: z.string().min(1).max(250),
  categoria: z.string().max(100).optional().nullable(),
  concluido: z.boolean().optional(),
  ordem: z.number().int().min(1),
  origem: z.enum(["manual", "ia"]).optional(),
});

const updateChecklistBody = createChecklistBody.partial().omit({ viagemId: true });
const toggleChecklistBody = z.object({ concluido: z.boolean() });

function toJsonChecklist(c: {
  id: string;
  viagemId: string;
  item: string;
  categoria: string | null;
  concluido: boolean;
  ordem: number;
  origem: string;
  criadoEm: Date;
}) {
  return {
    id: c.id,
    viagemId: c.viagemId,
    item: c.item,
    categoria: c.categoria,
    concluido: c.concluido,
    ordem: c.ordem,
    origem: c.origem,
    criadoEm: c.criadoEm.toISOString(),
  };
}

const checklistsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const usuarioId = await resolveUsuarioId(request);
    if (!usuarioId) {
      return sendError(reply, 401, "unauthorized", "Autenticação necessária.");
    }
    request.usuarioId = usuarioId;
  });

  app.get("/", async (request, reply) => {
    const query = z.object({ viagemId: z.string().min(1) }).safeParse(request.query);
    if (!query.success) {
      return sendError(reply, 400, "validation_error", "Query inválida.", query.error.flatten());
    }
    const viagem = await prisma.viagem.findFirst({
      where: { id: query.data.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const list = await prisma.checklist.findMany({
      where: { viagemId: query.data.viagemId },
      orderBy: [{ concluido: "asc" }, { ordem: "asc" }, { criadoEm: "asc" }],
    });
    return sendData(reply, list.map(toJsonChecklist));
  });

  app.post("/", async (request, reply) => {
    const parsed = createChecklistBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const body = parsed.data;
    const viagem = await prisma.viagem.findFirst({
      where: { id: body.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Viagem não encontrada.");

    const checklist = await prisma.checklist.create({
      data: {
        viagemId: body.viagemId,
        item: body.item,
        categoria: body.categoria ?? undefined,
        concluido: body.concluido ?? false,
        ordem: body.ordem,
        origem: body.origem ?? "manual",
      },
    });
    return reply.status(201).send({ data: toJsonChecklist(checklist) });
  });

  app.patch("/:id/toggle", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = toggleChecklistBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.checklist.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Checklist não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Checklist não encontrado.");

    const checklist = await prisma.checklist.update({
      where: { id },
      data: { concluido: parsed.data.concluido },
    });
    return sendData(reply, toJsonChecklist(checklist));
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateChecklistBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const existing = await prisma.checklist.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Checklist não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Checklist não encontrado.");

    const body = parsed.data;
    const checklist = await prisma.checklist.update({
      where: { id },
      data: {
        ...(body.item !== undefined && { item: body.item }),
        ...(body.categoria !== undefined && { categoria: body.categoria }),
        ...(body.concluido !== undefined && { concluido: body.concluido }),
        ...(body.ordem !== undefined && { ordem: body.ordem }),
        ...(body.origem !== undefined && { origem: body.origem }),
      },
    });
    return sendData(reply, toJsonChecklist(checklist));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.checklist.findUnique({ where: { id } });
    if (!existing) return sendError(reply, 404, "not_found", "Checklist não encontrado.");
    const viagem = await prisma.viagem.findFirst({
      where: { id: existing.viagemId, usuarioId: request.usuarioId!, deletadoEm: null },
    });
    if (!viagem) return sendError(reply, 404, "not_found", "Checklist não encontrado.");

    await prisma.checklist.delete({ where: { id } });
    return reply.status(204).send();
  });
};

export default checklistsRoutes;
