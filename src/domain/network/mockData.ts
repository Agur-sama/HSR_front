import type { AcademyGroup, AppUser, Assignment, ProjectScenario, StudentSolution, WorkDefinition } from './types';

export const initialScenario: ProjectScenario = {
  id: 'repair-demo',
  title: 'Текущий ремонт условного объекта',
  description:
    'Учебный сетевой график с параллельными работами, резервами и ограничением по доступным сотрудникам.',
  resourceLimit: 5,
  works: [
    {
      id: 'w1',
      code: '1-2',
      title: 'Подготовка объекта',
      from: '1',
      to: '2',
      duration: 3,
      labor: 9,
      workers: 3,
      dependencies: [],
    },
    {
      id: 'w2',
      code: '1-3',
      title: 'Диагностика',
      from: '1',
      to: '3',
      duration: 4,
      labor: 8,
      workers: 2,
      dependencies: [],
    },
    {
      id: 'w3',
      code: '2-4',
      title: 'Демонтаж',
      from: '2',
      to: '4',
      duration: 4,
      labor: 12,
      workers: 3,
      dependencies: ['w1'],
    },
    {
      id: 'w4',
      code: '3-4',
      title: 'Проверка оборудования',
      from: '3',
      to: '4',
      duration: 2,
      labor: 4,
      workers: 2,
      dependencies: ['w2'],
    },
    {
      id: 'w5',
      code: '4-5',
      title: 'Основные работы',
      from: '4',
      to: '5',
      duration: 6,
      labor: 24,
      workers: 4,
      dependencies: ['w3', 'w4'],
    },
    {
      id: 'w6',
      code: '4-6',
      title: 'Параллельная операция',
      from: '4',
      to: '6',
      duration: 3,
      labor: 6,
      workers: 2,
      dependencies: ['w3', 'w4'],
    },
    {
      id: 'w7',
      code: '5-7',
      title: 'Финальная сборка',
      from: '5',
      to: '7',
      duration: 3,
      labor: 9,
      workers: 3,
      dependencies: ['w5'],
    },
    {
      id: 'w8',
      code: '6-7',
      title: 'Контроль качества',
      from: '6',
      to: '7',
      duration: 2,
      labor: 4,
      workers: 2,
      dependencies: ['w6', 'w7'],
    },
  ],
};

export const defaultWorkDefinitions: WorkDefinition[] = initialScenario.works.map((work) => ({
  id: work.id,
  code: work.code,
  from: work.from,
  to: work.to,
  title: work.title,
  labor: work.labor,
  workers: work.workers,
  duration: work.duration,
  plannedShift: work.plannedShift,
  calculationMode: 'fixed-labor',
}));

export const mockGroups: AcademyGroup[] = [
  { id: 'g-101', title: 'КСГ-101', teacherId: 'u2' },
  { id: 'g-102', title: 'КСГ-102', teacherId: 'u2' },
];

export const mockUsers: AppUser[] = [
  { id: 'u1', name: 'Наталья Романова', email: 'admin@vsm.local', role: 'admin', status: 'active' },
  { id: 'u2', name: 'Олег Васильев', email: 'teacher@vsm.local', role: 'teacher', groupIds: ['g-101', 'g-102'], status: 'active' },
  { id: 'u3', name: 'Иванова Мария Сергеевна', email: 'm.ivanova@vsm.local', role: 'student', groupId: 'g-101', status: 'active' },
  { id: 'u4', name: 'Петров Алексей Игоревич', email: 'a.petrov@vsm.local', role: 'student', groupId: 'g-101', status: 'active' },
  { id: 'u5', name: 'Смирнова Анна Павловна', email: 'a.smirnova@vsm.local', role: 'student', groupId: 'g-101', status: 'active' },
  { id: 'u6', name: 'Ким Денис Олегович', email: 'd.kim@vsm.local', role: 'student', groupId: 'g-101', status: 'active' },
];

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    title: initialScenario.title,
    description: initialScenario.description,
    groupId: 'g-101',
    status: 'Активно',
  },
  {
    id: 'a2',
    title: 'Монтаж технологической линии',
    description: 'Черновой шаблон для следующего практического занятия.',
    groupId: 'g-102',
    status: 'Черновик',
  },
];

export const mockStudentSolutions: StudentSolution[] = [
  {
    studentId: 'u3',
    assignmentId: 'a1',
    status: 'Завершено',
    workDefinitions: defaultWorkDefinitions,
    history: [],
    savedAt: new Date().toISOString(),
  },
  {
    studentId: 'u4',
    assignmentId: 'a1',
    status: 'В работе',
    workDefinitions: defaultWorkDefinitions.map((work) => (work.id === 'w5' ? { ...work, workers: 3, duration: 8 } : work)),
    history: [],
  },
  {
    studentId: 'u5',
    assignmentId: 'a1',
    status: 'Завершено',
    workDefinitions: defaultWorkDefinitions.map((work) => (work.id === 'w5' ? { ...work, workers: 6, duration: 4 } : work)),
    history: [],
  },
  {
    studentId: 'u6',
    assignmentId: 'a1',
    status: 'Требует проверки',
    workDefinitions: defaultWorkDefinitions.map((work) => (work.id === 'w3' ? { ...work, workers: 1, duration: 12 } : work)),
    history: [],
  },
];

export const teacherGroups = [
  {
    id: 'g-101',
    title: 'КСГ-101',
    students: [
      { name: 'Иванова Мария Сергеевна', status: 'Завершено', duration: 17, maxWorkers: 7, violations: 0, score: 94 },
      { name: 'Петров Алексей Игоревич', status: 'В работе', duration: 19, maxWorkers: 9, violations: 2, score: 72 },
      { name: 'Смирнова Анна Павловна', status: 'Завершено', duration: 16, maxWorkers: 8, violations: 1, score: 88 },
      { name: 'Ким Денис Олегович', status: 'Требует проверки', duration: 21, maxWorkers: 11, violations: 4, score: 55 },
    ],
  },
  {
    id: 'g-102',
    title: 'КСГ-102',
    students: [
      { name: 'Орлова Виктория Андреевна', status: 'Завершено', duration: 18, maxWorkers: 7, violations: 0, score: 91 },
      { name: 'Морозов Кирилл Данилович', status: 'В работе', duration: 20, maxWorkers: 10, violations: 3, score: 64 },
    ],
  },
];

export const adminMockData = {
  users: [
    { id: 'u1', name: 'Наталья Романова', role: 'Админ', group: '-' },
    { id: 'u2', name: 'Олег Васильев', role: 'Учитель', group: 'КСГ-101, КСГ-102' },
    { id: 'u3', name: 'Мария Иванова', role: 'Студент', group: 'КСГ-101' },
    { id: 'u4', name: 'Алексей Петров', role: 'Студент', group: 'КСГ-101' },
  ],
  groups: [
    { id: 'g-101', title: 'КСГ-101', students: 24, teacher: 'Олег Васильев' },
    { id: 'g-102', title: 'КСГ-102', students: 21, teacher: 'Олег Васильев' },
  ],
  assignments: [
    { id: 'a1', title: 'Текущий ремонт условного объекта', works: 8, status: 'Активно' },
    { id: 'a2', title: 'Монтаж технологической линии', works: 12, status: 'Черновик' },
  ],
};
