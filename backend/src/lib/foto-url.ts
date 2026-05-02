/** Máx. ~240KB em base64 — avatar já vem redimensionado do app. */
export const FOTO_URL_MAX_LENGTH = 320_000;

const DATA_IMAGE_RE =
  /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=_-]+)$/i;

/**
 * Aceita URL http(s) ou data URI de imagem (base64) para persistir em `fotoUrl`.
 */
export function isValidFotoUrlRef(value: string): boolean {
  const s = value.trim().replace(/\s/g, "");
  if (s.length === 0 || s.length > FOTO_URL_MAX_LENGTH) return false;
  if (s.startsWith("data:image/")) {
    const m = DATA_IMAGE_RE.exec(s);
    return Boolean(m && m[2]!.length >= 80);
  }
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeFotoUrlInput(raw: string): string {
  return raw.trim().replace(/\s/g, "");
}
