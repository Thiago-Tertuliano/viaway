import type { FastifyReply } from "fastify";

export function sendData<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
  return reply.send(meta != null ? { data, meta } : { data });
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: Record<string, unknown> = { error: code, message };
  if (details !== undefined) body.details = details;
  return reply.status(status).send(body);
}
