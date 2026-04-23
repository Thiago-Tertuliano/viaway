import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Preenchido pelo `preHandler` das rotas autenticadas. */
    usuarioId?: string;
  }
}
