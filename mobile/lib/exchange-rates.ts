/**
 * Cotações com base no Frankfurter (dados do BCE / ECB).
 * Documentação: https://www.frankfurter.app/docs/
 */

export type FrankfurterLatest = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

const TARGETS_BY_BASE: Record<string, string[]> = {
  BRL: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'ARS', 'MXN', 'CLP', 'CNY', 'TRY', 'ZAR', 'SEK', 'NOK'],
  USD: ['BRL', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'MXN', 'ARS'],
  EUR: ['BRL', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'],
};

export const CURRENCY_NAMES: Record<string, string> = {
  BRL: 'Real',
  USD: 'Dólar (EUA)',
  EUR: 'Euro',
  GBP: 'Libra esterlina',
  JPY: 'Iene',
  CHF: 'Franco suíço',
  CAD: 'Dólar canadense',
  AUD: 'Dólar australiano',
  ARS: 'Peso argentino',
  MXN: 'Peso mexicano',
  CLP: 'Peso chileno',
  CNY: 'Yuan',
  TRY: 'Lira turca',
  ZAR: 'Rand',
  SEK: 'Coroa sueca',
  NOK: 'Coroa norueguesa',
};

export async function fetchFrankfurterLatest(base: string): Promise<FrankfurterLatest> {
  const upper = base.toUpperCase();
  const targets = TARGETS_BY_BASE[upper];
  if (!targets?.length) {
    throw new Error('Moeda base não suportada.');
  }
  const to = targets.join(',');
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(upper)}&to=${to}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const j = (await res.json()) as FrankfurterLatest;
  if (!j.rates || typeof j.rates !== 'object') {
    throw new Error('Resposta inválida da API de câmbio.');
  }
  return j;
}

export function formatRate(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1) return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  if (n >= 0.0001) return n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return n.toExponential(2);
}

/** Aceita digitação estilo BR (1.234,56) ou simples (500 ou 500.5). */
export function parseLocaleAmount(input: string): number {
  const t = input.trim();
  if (!t) return NaN;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = t.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = t.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = t.replace(',', '.');
  } else {
    normalized = t;
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Valor convertido para exibição (2 casas; JPY sem decimais). */
export function formatConvertedAmount(value: number, quoteCode: string): string {
  if (!Number.isFinite(value)) return '—';
  const isJpy = quoteCode === 'JPY';
  const opts: Intl.NumberFormatOptions = isJpy
    ? { maximumFractionDigits: 0, minimumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `${value.toLocaleString('pt-BR', opts)} ${quoteCode}`;
}
