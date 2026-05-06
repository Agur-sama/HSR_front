const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export type ApiUser = {
  id: number | string;
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  is_active?: boolean;
};

export function getAccessToken() {
  return localStorage.getItem('vsm-access-token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('vsm-access-token', access);
  localStorage.setItem('vsm-refresh-token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('vsm-access-token');
  localStorage.removeItem('vsm-refresh-token');
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Backend недоступен. Запустите сервер API на ${API_URL} или выполните docker compose up --build.`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Ошибка API.' }));
    throw new Error(payload.detail || payload.message || 'Ошибка API.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
