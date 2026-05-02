import { getApiBaseUrl } from './config';
import { getAccessToken, saveTokens, getRefreshToken, clearTokens } from './session';

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

// Flag para evitar loop infinito de refresh
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data?.data?.accessToken && data?.data?.refreshToken) {
        await saveTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit & {
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<TResponse> {
  const { query, ...init } = options;
  const url = buildUrl(path, query);
  
  // Obter token de acesso
  const accessToken = await getAccessToken();
  
  const headers: HeadersInit = {
    ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    ...(init.headers ?? {}),
  };

  let res = await fetch(url, { ...init, headers });
  const text = await res.text();

  if (res.status === 204) {
    return undefined as TResponse;
  }

  // Se token expirou (401), tentar refresh
  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Tentar novamente com novo token
      const newAccessToken = await getAccessToken();
      const retryHeaders: HeadersInit = {
        ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(newAccessToken ? { 'Authorization': `Bearer ${newAccessToken}` } : {}),
        ...(init.headers ?? {}),
      };
      res = await fetch(url, { ...init, headers: retryHeaders });
      const retryText = await res.text();
      
      if (res.status === 204) {
        return undefined as TResponse;
      }
      
      if (!res.ok) {
        let retryBody: { error?: string; message?: string; details?: unknown } | undefined;
        try {
          if (retryText) retryBody = JSON.parse(retryText);
        } catch {
          /* ignore */
        }
        const retryMsg = retryBody?.message || retryText || res.statusText;
        throw new ApiException(String(retryMsg), res.status, retryBody);
      }
      
      if (!retryText) return undefined as TResponse;
      return JSON.parse(retryText) as TResponse;
    } else {
      // Refresh falhou, limpar tokens
      await clearTokens();
    }
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
