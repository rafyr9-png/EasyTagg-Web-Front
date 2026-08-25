// Determinamos la URL base. Si VITE_API_URL está definida (deploy con frontend y backend
// en dominios separados), la usamos; si no, la ruta relativa '/api' (dev con proxy de Vite,
// o backend sirviendo el frontend desde el mismo origen).
const configuredBase = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
export const API_BASE = configuredBase || '/api';

export async function api(path: string, options: RequestInit = {}) {
  // 1. Normalizar el path para evitar duplicados de slashes o /api
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.replace('/api', '');
  }

  const token = localStorage.getItem('et_access_token');

  // 2. Preparar Headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Ejecutar la petición
  const response = await fetch(`${API_BASE}${cleanPath}`, {
    ...options,
    headers,
    credentials: 'include', // Necesario para que las cookies del token de refresco funcionen
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export default api;