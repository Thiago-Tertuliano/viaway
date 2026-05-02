import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { sendData, sendError } from "../../lib/reply.js";
import { getUsuarioIdIfValidAccessToken } from "../../auth/bearer-access.js";
import {
  issueTokenPair,
  verifyRefreshTokenString,
} from "../../auth/tokens.js";
import {
  FOTO_URL_MAX_LENGTH,
  isValidFotoUrlRef,
  normalizeFotoUrlInput,
} from "../../lib/foto-url.js";

const SALT_ROUNDS = 10;

const cadastroBody = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100),
});

const loginBody = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

const authRoutes: FastifyPluginAsync = async (app) => {
  // ─── Cadastro ──────────────────────────────────────────────────────────────
  app.post("/cadastro", async (request, reply) => {
    const parsed = cadastroBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const { nome, email, senha } = parsed.data;

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(reply, 409, "email_already_exists", "Este email já está cadastrado.");
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
      },
    });

    const tokens = issueTokenPair(usuario.id, usuario.email, usuario.tokenVersao);

    return reply.status(201).send({
      data: {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          plano: usuario.plano,
          fotoUrl: usuario.fotoUrl,
        },
        ...tokens,
      },
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────
  app.post("/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }
    const { email, senha } = parsed.data;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.senhaHash) {
      return sendError(reply, 401, "invalid_credentials", "Email ou senha inválidos.");
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return sendError(reply, 401, "invalid_credentials", "Email ou senha inválidos.");
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcesso: new Date() },
    });

    const tokens = issueTokenPair(usuario.id, usuario.email, usuario.tokenVersao);

    return sendData(reply, {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        plano: usuario.plano,
        fotoUrl: usuario.fotoUrl,
      },
      ...tokens,
    });
  });

  // ─── Refresh Token ─────────────────────────────────────────────────────────
  app.post("/refresh", async (request, reply) => {
    const parsed = refreshBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", parsed.error.flatten());
    }

    const payload = verifyRefreshTokenString(parsed.data.refreshToken);
    if (!payload) {
      return sendError(reply, 401, "invalid_token", "Refresh token inválido ou expirado.");
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: payload.sub, deletadoEm: null },
      select: { id: true, email: true, tokenVersao: true },
    });
    if (!usuario) {
      return sendError(reply, 401, "user_not_found", "Usuário não encontrado.");
    }
    if (usuario.tokenVersao !== payload.v) {
      return sendError(reply, 401, "token_revoked", "Sessão invalidada. Faça login novamente.");
    }

    const tokens = issueTokenPair(usuario.id, usuario.email, usuario.tokenVersao);

    return sendData(reply, tokens);
  });

  // ─── Obter Usuário Logado ──────────────────────────────────────────────────
  app.get("/me", async (request, reply) => {
    const usuarioId = await getUsuarioIdIfValidAccessToken(request.headers.authorization);
    if (!usuarioId) {
      return sendError(reply, 401, "invalid_token", "Token inválido ou expirado.");
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        fotoUrl: true,
        plano: true,
        proExpiraEm: true,
        criadoEm: true,
      },
    });

    if (!usuario) {
      return sendError(reply, 404, "not_found", "Usuário não encontrado.");
    }

    return sendData(reply, usuario);
  });

  // ─── Atualizar Perfil ──────────────────────────────────────────────────────
  app.put("/me", async (request, reply) => {
    const usuarioId = await getUsuarioIdIfValidAccessToken(request.headers.authorization);
    if (!usuarioId) {
      return sendError(reply, 401, "invalid_token", "Token inválido ou expirado.");
    }

    const body = z
      .object({
        nome: z.string().min(2).max(200).optional(),
        fotoUrl: z.union([z.string(), z.null()]).optional(),
        telefone: z.union([z.string().max(32), z.literal(""), z.null()]).optional(),
        email: z.string().email("Email inválido").optional(),
        senhaAtual: z.string().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", body.error.flatten());
    }

    const atual = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        email: true,
        tokenVersao: true,
        senhaHash: true,
      },
    });
    if (!atual) {
      return sendError(reply, 404, "not_found", "Usuário não encontrado.");
    }

    let fotoUrl: string | null | undefined;
    if (body.data.fotoUrl === undefined) {
      fotoUrl = undefined;
    } else if (body.data.fotoUrl === null) {
      fotoUrl = null;
    } else {
      const normalized = normalizeFotoUrlInput(body.data.fotoUrl);
      if (normalized.length > FOTO_URL_MAX_LENGTH) {
        return sendError(
          reply,
          400,
          "foto_too_large",
          "Imagem grande demais. Use uma foto menor.",
        );
      }
      if (!isValidFotoUrlRef(normalized)) {
        return sendError(
          reply,
          400,
          "invalid_foto_url",
          "URL ou imagem de perfil inválida.",
        );
      }
      fotoUrl = normalized;
    }

    let novoEmail: string | undefined;
    if (body.data.email !== undefined) {
      novoEmail = body.data.email.trim().toLowerCase();
      if (novoEmail !== atual.email.toLowerCase()) {
        if (!body.data.senhaAtual?.length) {
          return sendError(
            reply,
            400,
            "password_required",
            "Informe a senha atual para alterar o e-mail.",
          );
        }
        if (!atual.senhaHash) {
          return sendError(reply, 400, "no_password", "Conta sem senha definida.");
        }
        const ok = await bcrypt.compare(body.data.senhaAtual, atual.senhaHash);
        if (!ok) {
          return sendError(reply, 401, "invalid_password", "Senha atual incorreta.");
        }
        const taken = await prisma.usuario.findUnique({
          where: { email: novoEmail },
          select: { id: true },
        });
        if (taken) {
          return sendError(reply, 409, "email_already_exists", "Este e-mail já está em uso.");
        }
      } else {
        novoEmail = undefined;
      }
    }

    const patch: {
      nome?: string;
      fotoUrl?: string | null;
      telefone?: string | null;
      email?: string;
    } = {};
    if (body.data.nome !== undefined) patch.nome = body.data.nome;
    if (fotoUrl !== undefined) patch.fotoUrl = fotoUrl;
    if (body.data.telefone !== undefined) {
      const t = body.data.telefone;
      patch.telefone = t === null || t === "" ? null : t.trim();
    }
    if (novoEmail !== undefined) patch.email = novoEmail;

    if (Object.keys(patch).length === 0) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          fotoUrl: true,
          plano: true,
        },
      });
      return sendData(reply, usuario!);
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: patch,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        fotoUrl: true,
        plano: true,
        tokenVersao: true,
      },
    });

    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    if (novoEmail !== undefined) {
      const pair = issueTokenPair(
        usuario.id,
        usuario.email,
        usuario.tokenVersao,
      );
      accessToken = pair.accessToken;
      refreshToken = pair.refreshToken;
    }

    const { tokenVersao: _tv, ...rest } = usuario;
    return sendData(reply, {
      ...rest,
      ...(accessToken && refreshToken ? { accessToken, refreshToken } : {}),
    });
  });

  // ─── Alterar Senha ─────────────────────────────────────────────────────────
  app.put("/senha", async (request, reply) => {
    const usuarioId = await getUsuarioIdIfValidAccessToken(request.headers.authorization);
    if (!usuarioId) {
      return sendError(reply, 401, "invalid_token", "Token inválido ou expirado.");
    }

    const body = z
      .object({
        senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
        novaSenha: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").max(100),
      })
      .safeParse(request.body);

    if (!body.success) {
      return sendError(reply, 400, "validation_error", "Dados inválidos.", body.error.flatten());
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario?.senhaHash) {
      return sendError(reply, 400, "no_password", "Usuário não possui senha definida.");
    }

    const senhaValida = await bcrypt.compare(body.data.senhaAtual, usuario.senhaHash);
    if (!senhaValida) {
      return sendError(reply, 401, "invalid_password", "Senha atual incorreta.");
    }

    const novaSenhaHash = await bcrypt.hash(body.data.novaSenha, SALT_ROUNDS);
    const atualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senhaHash: novaSenhaHash,
        tokenVersao: { increment: 1 },
      },
      select: { id: true, email: true, tokenVersao: true },
    });

    const tokens = issueTokenPair(
      atualizado.id,
      atualizado.email,
      atualizado.tokenVersao,
    );

    return sendData(reply, {
      message: "Senha alterada com sucesso.",
      ...tokens,
    });
  });
};

export default authRoutes;
