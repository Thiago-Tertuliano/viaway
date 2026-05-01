import { getApiBaseUrl } from './config';

export class ApiException extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: { error?: string; message?: string; details?: unknown },
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + p);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined) return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export type ApiListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit & {
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<TResponse> {
  const { query, ...init } = options;
  const url = buildUrl(path, query);
  const headers: HeadersInit = {
    ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers ?? {}),
  };

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();

  if (res.status === 204) {
    return undefined as TResponse;
  }

  if (!res.ok) {
    let body: { error?: string; message?: string; details?: unknown } | undefined;
    try {
      if (text) body = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const msg = body?.message || text || res.statusText;
    throw new ApiException(String(msg), res.status, body);
  }

  if (!text) return undefined as TResponse;
  return JSON.parse(text) as TResponse;
}

export async function apiGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
  return apiFetch<T>(path, { method: 'GET', query });
}

export async function apiPost<TBody, TRes>(path: string, body: TBody) {
  return apiFetch<TRes>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut<TBody, TRes>(path: string, body: TBody) {
  return apiFetch<TRes>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiPatch<TBody, TRes>(path: string, body: TBody) {
  return apiFetch<TRes>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function apiDelete(path: string) {
  return apiFetch<undefined>(path, { method: 'DELETE' });
}
