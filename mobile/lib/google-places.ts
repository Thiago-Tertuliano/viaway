export type PlaceCategory =
  | 'tourist_attraction'
  | 'restaurant'
  | 'cafe'
  | 'lodging'
  | 'bar'
  | 'museum';

export type SearchFilters = {
  city: string;
  /** Opcional: restringe ao tipo principal do lugar (Places API). */
  category?: PlaceCategory | null;
  /** Opcional: nota mínima (0–5, API arredonda). */
  minRating?: number | null;
  /**
   * Opcional: custo máximo em “níveis” 1–4 ($ a $$$$).
   * Enviado como `priceLevels` aceitos na API.
   */
  maxPriceLevel?: number | null;
  /** Opcional: termo livre. */
  query?: string | null;
  /** Sobrescreve o default de env; senão usa `getPlacesConfig().pageSize`. */
  pageSize?: number;
  /** Paginação: token da página anterior. */
  pageToken?: string | null;
};

export type GooglePlaceResult = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  primaryType: string | null;
  mapsUri: string | null;
};

export type PlacesSearchPage = {
  results: GooglePlaceResult[];
  nextPageToken: string | null;
};

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.googleMapsUri,nextPageToken';

const memoryCache = new Map<string, { expiresAt: number; page: PlacesSearchPage }>();

function apiKey() {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ?? '';
}

export function hasGooglePlacesKey() {
  return Boolean(apiKey());
}

/** Configuração lida de variáveis EXPO_PUBLIC_* (documentadas no `.env.example`). */
export function getPlacesConfig() {
  const rawSize = parseInt(process.env.EXPO_PUBLIC_PLACES_PAGE_SIZE ?? '20', 10);
  const pageSize = Number.isFinite(rawSize) ? Math.min(20, Math.max(1, rawSize)) : 20;

  const rawTtl = parseInt(
    process.env.EXPO_PUBLIC_PLACES_CACHE_TTL_MS ?? String(24 * 60 * 60 * 1000),
    10,
  );
  const ttlMs = Number.isFinite(rawTtl) && rawTtl >= 0 ? rawTtl : 24 * 60 * 60 * 1000;

  const cacheEnabled =
    (process.env.EXPO_PUBLIC_PLACES_CACHE_ENABLED ?? 'true').toLowerCase() !== 'false';

  return { pageSize, ttlMs, cacheEnabled };
}

function cacheKey(filters: SearchFilters, pageSize: number): string {
  return JSON.stringify({
    city: filters.city.trim(),
    category: filters.category ?? null,
    minRating: filters.minRating ?? null,
    maxPriceLevel: filters.maxPriceLevel ?? null,
    query: (filters.query ?? '').trim(),
    pageSize,
    pageToken: filters.pageToken?.trim() ?? '',
  });
}

function priceLevelsUpTo(maxLevel: number): string[] {
  const all = [
    'PRICE_LEVEL_INEXPENSIVE',
    'PRICE_LEVEL_MODERATE',
    'PRICE_LEVEL_EXPENSIVE',
    'PRICE_LEVEL_VERY_EXPENSIVE',
  ] as const;
  const n = Math.min(4, Math.max(1, Math.floor(maxLevel)));
  return all.slice(0, n) as string[];
}

function buildTextQuery(city: string, query?: string | null): string {
  const q = query?.trim();
  if (q) return `${q} em ${city}`;
  return `lugares para visitar em ${city}`;
}

function toPriceLevel(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[v] ?? null;
}

/** Limpa cache em memória (útil para testes). */
export function clearPlacesSearchCache() {
  memoryCache.clear();
}

export async function searchGooglePlacesByCity(filters: SearchFilters): Promise<PlacesSearchPage> {
  const key = apiKey();
  if (!key) {
    throw new Error('Configure EXPO_PUBLIC_GOOGLE_PLACES_API_KEY para usar a busca de lugares.');
  }

  const { pageSize: defaultSize, ttlMs, cacheEnabled } = getPlacesConfig();
  const pageSize = filters.pageSize ?? defaultSize;
  const keyStr = cacheKey(filters, pageSize);

  if (cacheEnabled && ttlMs > 0) {
    const hit = memoryCache.get(keyStr);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.page;
    }
  }

  const body: Record<string, unknown> = {
    textQuery: buildTextQuery(filters.city, filters.query),
    languageCode: 'pt-BR',
    regionCode: 'BR',
    pageSize,
  };

  if (filters.category) {
    body.includedType = filters.category;
  }

  if (typeof filters.minRating === 'number') {
    body.minRating = filters.minRating;
  }

  if (typeof filters.maxPriceLevel === 'number' && filters.maxPriceLevel >= 1) {
    body.priceLevels = priceLevelsUpTo(filters.maxPriceLevel);
  }

  if (filters.pageToken?.trim()) {
    body.pageToken = filters.pageToken.trim();
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Places retornou ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string | number;
      primaryType?: string;
      googleMapsUri?: string;
    }>;
    nextPageToken?: string;
  };

  const rows: GooglePlaceResult[] = (json.places ?? []).map((p) => ({
    id: p.id ?? '',
    name: p.displayName?.text ?? 'Sem nome',
    address: p.formattedAddress ?? 'Endereço indisponível',
    rating: typeof p.rating === 'number' ? p.rating : null,
    userRatingsTotal: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    priceLevel: toPriceLevel(p.priceLevel),
    primaryType: p.primaryType ?? null,
    mapsUri: p.googleMapsUri ?? null,
  }));

  const page: PlacesSearchPage = {
    results: rows,
    nextPageToken: json.nextPageToken?.trim() ? json.nextPageToken : null,
  };

  if (cacheEnabled && ttlMs > 0) {
    memoryCache.set(keyStr, { expiresAt: Date.now() + ttlMs, page });
  }

  return page;
}
