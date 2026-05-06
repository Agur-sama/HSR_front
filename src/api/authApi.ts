import { apiRequest, clearTokens, setTokens, type ApiUser } from './client';

export type LoginResponse = {
  access: string;
  refresh: string;
  user: ApiUser;
};

export async function login(email: string, password: string) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(response.access, response.refresh);
  return response.user;
}

export async function me() {
  return apiRequest<ApiUser>('/auth/me');
}

export async function logout() {
  const refresh = localStorage.getItem('vsm-refresh-token');
  try {
    await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh }) });
  } finally {
    clearTokens();
  }
}
