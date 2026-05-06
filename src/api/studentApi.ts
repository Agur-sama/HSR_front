import { apiRequest } from './client';

export const studentApi = {
  assignments: () => apiRequest('/student/assignments'),
  assignment: (assignmentId: number | string) => apiRequest(`/student/assignments/${assignmentId}`),
  solution: (solutionId: number | string) => apiRequest(`/student/solutions/${solutionId}`),
  updateWork: (solutionId: number | string, workId: number | string, payload: unknown) =>
    apiRequest(`/student/solutions/${solutionId}/works/${workId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addWork: (solutionId: number | string, payload: unknown) =>
    apiRequest(`/student/solutions/${solutionId}/works`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteWork: (solutionId: number | string, workId: number | string) =>
    apiRequest(`/student/solutions/${solutionId}/works/${workId}`, { method: 'DELETE' }),
  reset: (solutionId: number | string) => apiRequest(`/student/solutions/${solutionId}/reset`, { method: 'POST' }),
  submit: (solutionId: number | string) => apiRequest(`/student/solutions/${solutionId}/submit`, { method: 'POST' }),
};
