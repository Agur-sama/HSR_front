import { apiRequest } from './client';

export const teacherApi = {
  groups: () => apiRequest('/teacher/groups'),
  group: (groupId: number | string) => apiRequest(`/teacher/groups/${groupId}`),
  groupStatistics: (groupId: number | string) => apiRequest(`/teacher/groups/${groupId}/statistics`),
  studentStatistics: (studentId: number | string) => apiRequest(`/teacher/students/${studentId}/statistics`),
  solution: (solutionId: number | string) => apiRequest(`/teacher/solutions/${solutionId}`),
  addComment: (solutionId: number | string, text: string) =>
    apiRequest(`/teacher/solutions/${solutionId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  check: (solutionId: number | string, score: number, comment: string) =>
    apiRequest(`/teacher/solutions/${solutionId}/check`, { method: 'POST', body: JSON.stringify({ score, comment }) }),
};
