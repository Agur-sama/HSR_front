import { useMemo, useState } from 'react';
import { buildWorkItemsFromDefinitions, calculateSchedule, getProjectMetrics } from '../../domain/network/calculations';
import { initialScenario } from '../../domain/network/mockData';
import { readGroups, readSolutions, readUsers } from '../../utils/storage';

type TeacherDashboardProps = {
  onOpenStudent: (studentId: string) => void;
};

export function TeacherDashboard({ onOpenStudent }: TeacherDashboardProps) {
  const groups = readGroups();
  const users = readUsers();
  const solutions = readSolutions();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');
  const [filter, setFilter] = useState('all');
  const group = groups.find((item) => item.id === selectedGroupId) ?? groups[0];
  const students = users.filter((user) => user.role === 'student' && user.groupId === group?.id);
  const rows = students.map((student) => {
    const solution = solutions.find((item) => item.studentId === student.id);
    const metrics = solution ? metricsForSolution(solution.workDefinitions) : null;
    return { student, solution, metrics };
  });
  const filteredRows = rows.filter((row) => {
    if (filter === 'done') return row.solution?.status === 'Завершено';
    if (filter === 'not-done') return row.solution?.status !== 'Завершено';
    if (filter === 'errors') return !row.metrics;
    if (filter === 'best') return row.metrics?.projectDuration === Math.min(...rows.map((item) => item.metrics?.projectDuration ?? 999));
    if (filter === 'review') return row.solution?.status === 'Требует проверки';
    return true;
  });
  const summary = useMemo(() => {
    const valid = rows.filter((row) => row.metrics);
    const averageDuration = valid.length ? Math.round(valid.reduce((sum, row) => sum + row.metrics!.projectDuration, 0) / valid.length) : 0;
    const averageScore = valid.length ? Math.round(valid.reduce((sum, row) => sum + scoreFor(row.metrics!), 0) / valid.length) : 0;
    return {
      averageDuration,
      averageScore,
      completed: rows.filter((row) => row.solution?.status === 'Завершено').length,
      improved: valid.filter((row) => row.metrics!.projectDuration < 18).length,
      worsened: valid.filter((row) => row.metrics!.projectDuration > 18).length,
      overloaded: valid.filter((row) => row.metrics!.overloadDays > 0).length,
      unchangedCritical: valid.filter((row) => row.metrics!.criticalCount === 5).length,
    };
  }, [rows]);

  return (
    <div className="dashboard-grid teacher-lms">
      <section className="panel">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Учебные группы</h2>
            <p>Выберите группу, чтобы посмотреть прогресс студентов и открыть их решения.</p>
          </div>
          <span>{groups.length}</span>
        </div>
        <div className="group-list">
          {groups.map((item) => (
            <button type="button" key={item.id} className={item.id === selectedGroupId ? 'is-selected' : ''} onClick={() => setSelectedGroupId(item.id)}>
              {item.title}<small>{users.filter((user) => user.groupId === item.id).length} студентов</small>
            </button>
          ))}
        </div>
      </section>
      <section className="panel dashboard-main">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Проверка решений: {group?.title}</h2>
            <p>Откройте работу студента, сравните с эталоном, оставьте комментарий или верните решение на доработку.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Все студенты</option>
            <option value="done">Завершили</option>
            <option value="not-done">Не завершили</option>
            <option value="errors">Есть ошибки</option>
            <option value="best">Лучший результат</option>
            <option value="review">Требуется проверка</option>
          </select>
        </div>
        <div className="teacher-summary">
          <article><span>Средний срок</span><strong>{summary.averageDuration} дн.</strong></article>
          <article><span>Средняя оценка</span><strong>{summary.averageScore}%</strong></article>
          <article><span>Завершили</span><strong>{summary.completed}</strong></article>
          <article><span>Улучшили срок</span><strong>{summary.improved}</strong></article>
          <article><span>Ухудшили срок</span><strong>{summary.worsened}</strong></article>
          <article><span>Есть перегрузка</span><strong>{summary.overloaded}</strong></article>
          <article><span>Критический путь без изменений</span><strong>{summary.unchangedCritical}</strong></article>
        </div>
        <div className="teacher-tools">
          <button className="button button--ghost" type="button">Сравнить с эталоном</button>
          <button className="button button--ghost" type="button">Вернуть на доработку</button>
          <button className="button button--primary" type="button">Экспорт ведомости</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ФИО</th><th>Статус</th><th>Срок</th><th>Макс. занятость</th><th>Нарушения</th><th>Оценка</th><th></th></tr></thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.student.id}>
                  <td>{row.student.name}</td>
                  <td>{row.solution?.status ?? 'Не начато'}</td>
                  <td>{row.metrics ? `${row.metrics.projectDuration} дн.` : 'Ошибка'}</td>
                  <td>{row.metrics ? `${row.metrics.maxWorkers} чел.` : '-'}</td>
                  <td>{row.metrics?.overloadDays ?? 1}</td>
                  <td>{row.metrics ? `${scoreFor(row.metrics)}%` : '0%'}</td>
                  <td><button className="button button--primary" type="button" onClick={() => onOpenStudent(row.student.id)}>Открыть работу</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function metricsForSolution(definitions: Parameters<typeof buildWorkItemsFromDefinitions>[0]) {
  const built = buildWorkItemsFromDefinitions(definitions);
  if (built.errors.length) return null;
  const schedule = calculateSchedule(built.items);
  if (schedule.errors.length) return null;
  return getProjectMetrics(schedule.items, initialScenario.resourceLimit);
}

function scoreFor(metrics: NonNullable<ReturnType<typeof metricsForSolution>>) {
  return Math.max(45, Math.min(100, 100 - metrics.overloadDays * 5 - Math.max(0, metrics.projectDuration - 18) * 3));
}
