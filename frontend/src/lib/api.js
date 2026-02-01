/**
 * API client for FastAPI backend. Pass Supabase session access_token for auth.
 * In production (Vercel), set VITE_API_URL to your backend URL (e.g. https://nanis-api.onrender.com).
 */

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || 'http://localhost:8000';

if (import.meta.env.DEV) {
  console.log('[Nanis] API base URL:', baseUrl);
}

export function getApiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/v1${p}`;
}

/**
 * @param {string} path - e.g. '/health' or '/onboard/me'
 * @param {{ method?: string; body?: object; token?: string | null; timeout?: number }} [opts] - timeout in ms (optional)
 * @returns {Promise<{ ok: boolean; data?: any; status: number; error?: string }>}
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, token, timeout } = opts;
  const url = getApiUrl(path);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = timeout != null ? new AbortController() : null;
  const timeoutId = controller && timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller?.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);
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
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    const message = isAbort ? 'Request timed out. The server may be waking up—please try again.' : (err.message || 'Network error');
    const isNetworkError = !isAbort && (message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.' || message === 'Network error');
    const hint = isNetworkError
      ? ` Make sure the backend is running and VITE_API_URL points to it (currently: ${baseUrl}).`
      : '';
    return {
      ok: false,
      status: 0,
      error: message + hint,
    };
  }
}
