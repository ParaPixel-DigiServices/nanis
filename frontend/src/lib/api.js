/**
 * API client for FastAPI backend. Pass Supabase session access_token for auth.
 */

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || 'http://localhost:8000';

export function getApiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/v1${p}`;
}

/**
 * @param {string} path - e.g. '/health' or '/onboard/me'
 * @param {{ method?: string; body?: object; token?: string | null }} [opts]
 * @returns {Promise<{ ok: boolean; data?: any; status: number; error?: string }>}
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, token } = opts;
  const url = getApiUrl(path);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.detail ?? data?.message ?? res.statusText,
      };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network error',
    };
  }
}
