import {
  defaultWorkDefinitions,
  mockAssignments,
  mockGroups,
  mockStudentSolutions,
  mockUsers,
} from '../domain/network/mockData';
import type {
  AcademyGroup,
  AppUser,
  Assignment,
  StudentSolution,
  TeacherComment,
  UserRole,
  WorkDefinition,
} from '../domain/network/types';

const keys = {
  currentUser: 'vsm-academy-current-user',
  users: 'vsm-academy-users',
  groups: 'vsm-academy-groups',
  assignments: 'vsm-academy-assignments',
  solutions: 'vsm-academy-solutions',
  comments: 'vsm-academy-teacher-comments',
};

export function readUsers(): AppUser[] {
  return read(keys.users, mockUsers);
}

export function writeUsers(users: AppUser[]) {
  write(keys.users, users);
}

export function readGroups(): AcademyGroup[] {
  return read(keys.groups, mockGroups);
}

export function writeGroups(groups: AcademyGroup[]) {
  write(keys.groups, groups);
}

export function readAssignments(): Assignment[] {
  return read(keys.assignments, mockAssignments);
}

export function writeAssignments(assignments: Assignment[]) {
  write(keys.assignments, assignments);
}

export function readSolutions(): StudentSolution[] {
  const solutions = read(keys.solutions, mockStudentSolutions);
  const users = readUsers().filter((user) => user.role === 'student');
  const existingIds = new Set(solutions.map((solution) => solution.studentId));
  const missing = users
    .filter((user) => !existingIds.has(user.id))
    .map((user) => createDefaultSolution(user.id));
  return [...solutions, ...missing];
}

export function writeSolutions(solutions: StudentSolution[]) {
  write(keys.solutions, solutions);
}

export function readComments(): TeacherComment[] {
  return read(keys.comments, []);
}

export function writeComments(comments: TeacherComment[]) {
  write(keys.comments, comments);
}

export function getCurrentUser(): AppUser | null {
  const id = localStorage.getItem(keys.currentUser);
  return readUsers().find((user) => user.id === id) ?? null;
}

export function setCurrentUser(userId: string | null) {
  if (userId) {
    localStorage.setItem(keys.currentUser, userId);
  } else {
    localStorage.removeItem(keys.currentUser);
  }
}

export function findUserByRole(role: UserRole): AppUser | undefined {
  return readUsers().find((user) => user.role === role && user.status === 'active');
}

export function createDefaultSolution(studentId: string): StudentSolution {
  return {
    studentId,
    assignmentId: 'a1',
    status: 'В работе',
    workDefinitions: cloneDefinitions(defaultWorkDefinitions),
    history: [],
  };
}

export function cloneDefinitions(definitions: WorkDefinition[]): WorkDefinition[] {
  return definitions.map((definition) => ({ ...definition }));
}

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}
