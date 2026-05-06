import { apiRequest } from './client';

export const adminApi = {
  users: () => apiRequest('/admin/users/'),
  createUser: (payload: unknown) => apiRequest('/admin/users/', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: number | string, payload: unknown) => apiRequest(`/admin/users/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteUser: (id: number | string) => apiRequest(`/admin/users/${id}/`, { method: 'DELETE' }),
  groups: () => apiRequest('/admin/groups/'),
  assignments: () => apiRequest('/admin/assignments/'),
  statistics: () => apiRequest('/admin/statistics'),
};
