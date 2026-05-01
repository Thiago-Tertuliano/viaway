/** UFs com PNG em github.com/bgeneto/bandeiras-br */
const VALID_UF = new Set([
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
]);

const STATE_PNG_BASE =
  'https://raw.githubusercontent.com/bgeneto/bandeiras-br/master/imagens';

function commonsFilePathUrl(filename: string, width = 160) {
  const enc = encodeURIComponent(filename);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}?width=${width}`;
}

/** Bandeira do estado (PNG). `null` se UF inválida. */
export function brazilStateFlagUrl(uf: string): string | null {
  const u = uf.trim().toUpperCase();
  if (u.length !== 2 || !VALID_UF.has(u)) return null;
  return `${STATE_PNG_BASE}/${u}.png`;
}

/**
 * URLs para tentar na bandeira do município (Wikimedia Commons) e, por último, a do estado.
 * Ordem: nomes mais comuns em arquivo no Commons; `onError` no app troca para a próxima.
 */
export function brazilCityFlagUrls(cidade: string, uf: string): string[] {
  const c = cidade.trim();
  const out: string[] = [];
  if (c) {
    out.push(commonsFilePathUrl(`Bandeira de ${c}.svg`));
    out.push(commonsFilePathUrl(`Bandeira do município de ${c}.svg`));
    out.push(commonsFilePathUrl(`Bandeira da cidade de ${c}.svg`));
  }
  const st = brazilStateFlagUrl(uf);
  if (st) out.push(st);
  return out;
}
