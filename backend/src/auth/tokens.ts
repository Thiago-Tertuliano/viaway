import jwt from "jsonwebtoken";

const TYP_ACCESS = "access" as const;
const TYP_REFRESH = "refresh" as const;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  typ: typeof TYP_ACCESS;
  v: number;
};

export type RefreshTokenPayload = {
  sub: string;
  typ: typeof TYP_REFRESH;
  v: number;
};

let cachedSecrets: { access: string; refresh: string } | null = null;

/**
 * Segredos distintos: refresh nunca pode ser validado como access.
 * Produção: JWT_REFRESH_SECRET obrigatório e diferente do access.
 */
export function getJwtSecrets(): { access: string; refresh: string } {
  if (cachedSecrets) return cachedSecrets;

  const access =
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" ? "viaway-dev-access-change-me" : "");

  const refresh =
    process.env.JWT_REFRESH_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" && access
      ? `${access}.refresh-dev`
      : "");

  if (!access) {
    throw new Error(
      "Defina JWT_ACCESS_SECRET ou JWT_SECRET para emitir/validar tokens.",
    );
  }
  if (!refresh) {
    throw new Error(
      "Em produção defina JWT_REFRESH_SECRET (obrigatório e diferente do segredo de access).",
    );
  }
  if (process.env.NODE_ENV === "production" && refresh === access) {
    throw new Error(
      "Em produção JWT_REFRESH_SECRET deve ser diferente do segredo de access.",
    );
  }

  cachedSecrets = { access, refresh };
  return cachedSecrets;
}

export function assertJwtSecretsConfigured(): void {
  getJwtSecrets();
}

function verifyOptions(): jwt.VerifyOptions {
  const o: jwt.VerifyOptions = { algorithms: ["HS256"] };
  if (process.env.JWT_ISSUER) o.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) o.audience = process.env.JWT_AUDIENCE;
  return o;
}

function buildSignOptions(expiresIn: string): jwt.SignOptions {
  const o: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  };
  if (process.env.JWT_ISSUER) o.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) o.audience = process.env.JWT_AUDIENCE;
  return o;
}

const ACCESS_EXPIRES =
  process.env.JWT_ACCESS_EXPIRES_IN?.trim() || "15m";
const REFRESH_EXPIRES =
  process.env.JWT_REFRESH_EXPIRES_IN?.trim() || "7d";

export function signAccessToken(
  userId: string,
  email: string,
  tokenVersao: number,
): string {
  const { access } = getJwtSecrets();
  const payload: AccessTokenPayload = {
    sub: userId,
    email,
    typ: TYP_ACCESS,
    v: tokenVersao,
  };
  return jwt.sign(payload, access, buildSignOptions(ACCESS_EXPIRES));
}

export function signRefreshToken(userId: string, tokenVersao: number): string {
  const { refresh } = getJwtSecrets();
  const payload: RefreshTokenPayload = {
    sub: userId,
    typ: TYP_REFRESH,
    v: tokenVersao,
  };
  return jwt.sign(payload, refresh, buildSignOptions(REFRESH_EXPIRES));
}

export function verifyAccessTokenString(
  token: string,
): AccessTokenPayload | null {
  try {
    const { access } = getJwtSecrets();
    const decoded = jwt.verify(token, access, verifyOptions()) as unknown;
    if (!decoded || typeof decoded !== "object") return null;
    const p = decoded as Record<string, unknown>;
    if (p.typ !== TYP_ACCESS) return null;
    if (typeof p.sub !== "string" || typeof p.email !== "string") return null;
    if (typeof p.v !== "number" || !Number.isInteger(p.v)) return null;
    return {
      sub: p.sub,
      email: p.email,
      typ: TYP_ACCESS,
      v: p.v,
    };
  } catch {
    return null;
  }
}

export function verifyRefreshTokenString(
  token: string,
): RefreshTokenPayload | null {
  try {
    const { refresh } = getJwtSecrets();
    const decoded = jwt.verify(token, refresh, verifyOptions()) as unknown;
    if (!decoded || typeof decoded !== "object") return null;
    const p = decoded as Record<string, unknown>;
    if (p.typ !== TYP_REFRESH) return null;
    if (typeof p.sub !== "string") return null;
    if (typeof p.v !== "number" || !Number.isInteger(p.v)) return null;
    return {
      sub: p.sub,
      typ: TYP_REFRESH,
      v: p.v,
    };
  } catch {
    return null;
  }
}

export function issueTokenPair(
  userId: string,
  email: string,
  tokenVersao: number,
): { accessToken: string; refreshToken: string } {
  return {
    accessToken: signAccessToken(userId, email, tokenVersao),
    refreshToken: signRefreshToken(userId, tokenVersao),
  };
}
