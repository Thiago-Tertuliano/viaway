const STATIC_USD_BASE: Record<string, number> = {
  USD: 1,
  BRL: 5.25,
  EUR: 0.92,
  GBP: 0.79,
  ARS: 880,
  CLP: 930,
  COP: 3900,
  UYU: 39.5,
  MXN: 16.8,
  AUD: 1.51,
  NZD: 1.63,
  CNY: 7.24,
  JPY: 155,
  CAD: 1.36,
  CHF: 0.9,
};

export const SUPPORTED_CURRENCIES = Object.keys(STATIC_USD_BASE).sort();

type ConvertInput = {
  from: string;
  to: string;
  amount: number;
  iofPercentual?: number | null;
  taxaPercentual?: number | null;
};

export type ConvertResult = {
  from: string;
  to: string;
  amount: number;
  rate: number;
  converted: number;
  iofPercentual: number;
  taxaPercentual: number;
  totalWithTaxes: number;
  provider: string;
};

function round2(v: number) {
  return Number(v.toFixed(2));
}

function normalize(code: string) {
  return code.trim().toUpperCase();
}

async function fetchRateAwesome(from: string, to: string): Promise<number | null> {
  const pair = `${from}-${to}`;
  const key = `${from}${to}`;
  const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${pair}`);
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, { bid?: string } | undefined>;
  const bid = json[key]?.bid;
  if (!bid) return null;
  const parsed = Number.parseFloat(bid);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function fetchRateOpenEr(from: string, to: string): Promise<number | null> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { rates?: Record<string, number> };
  const rate = json.rates?.[to];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

function staticRate(from: string, to: string): number | null {
  const fromUsd = STATIC_USD_BASE[from];
  const toUsd = STATIC_USD_BASE[to];
  if (!fromUsd || !toUsd) return null;
  return toUsd / fromUsd;
}

export async function resolveRate(fromRaw: string, toRaw: string) {
  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  if (from === to) return { rate: 1, provider: "identity" };

  try {
    const r = await fetchRateAwesome(from, to);
    if (r) return { rate: r, provider: "awesomeapi" };
  } catch {}

  try {
    const r = await fetchRateOpenEr(from, to);
    if (r) return { rate: r, provider: "open-er-api" };
  } catch {}

  const fallback = staticRate(from, to);
  if (fallback) return { rate: fallback, provider: "static-fallback" };
  return null;
}

export async function convertCurrency(input: ConvertInput): Promise<ConvertResult | null> {
  const from = normalize(input.from);
  const to = normalize(input.to);
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const rateResult = await resolveRate(from, to);
  if (!rateResult) return null;

  const converted = amount * rateResult.rate;
  const iof = input.iofPercentual ?? 0;
  const taxa = input.taxaPercentual ?? 0;
  const totalWithTaxes = converted * (1 + iof / 100 + taxa / 100);

  return {
    from,
    to,
    amount,
    rate: Number(rateResult.rate.toFixed(6)),
    converted: round2(converted),
    iofPercentual: iof,
    taxaPercentual: taxa,
    totalWithTaxes: round2(totalWithTaxes),
    provider: rateResult.provider,
  };
}
