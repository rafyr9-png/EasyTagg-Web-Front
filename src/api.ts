const API = '/api';

async function ensureDevToken() {
  if (typeof window === 'undefined') return;
  try {
    const token = localStorage.getItem('et_access_token');
    if (token) return;
    // only auto-login on localhost or when explicitly allowed
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    const res = await fetch('/api/dev/login', { method: 'POST' });
    if (!res.ok) return;
    const j = await res.json().catch(() => null);
    if (j?.accessToken) localStorage.setItem('et_access_token', j.accessToken);
  } catch (e) {
    /* ignore */
  }
}

export async function api(path: string, options: RequestInit = {}) {
  await ensureDevToken();
  const token = localStorage.getItem('et_access_token');
  const headers: any = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { ...options, headers, credentials: 'include' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default api;
