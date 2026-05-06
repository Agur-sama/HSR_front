import { useMemo, useState } from 'react';
import { CalculationsTable } from '../../components/CalculationsTable/CalculationsTable';
import { GanttChart } from '../../components/GanttChart/GanttChart';
import { PlatformShell } from '../../components/Layout/PlatformShell';
import { MetricsCards } from '../../components/MetricsCards/MetricsCards';
import { ResourceChart } from '../../components/ResourceChart/ResourceChart';
import { WorkDefinitionTable } from '../../components/WorkDefinitionTable/WorkDefinitionTable';
import { buildWorkItemsFromDefinitions, calculateResourceUsage, calculateSchedule, getProjectMetrics } from '../../domain/network/calculations';
import { initialScenario } from '../../domain/network/mockData';
import type { UserRole } from '../../domain/network/types';
import { readComments, readGroups, readSolutions, readUsers, writeComments } from '../../utils/storage';

type StudentReviewPageProps = {
  role: UserRole;
  studentId: string;
  onBack: () => void;
  onLogout: () => void;
};

export function StudentReviewPage({ role, studentId, onBack, onLogout }: StudentReviewPageProps) {
  const users = readUsers();
  const groups = readGroups();
  const solutions = readSolutions();
  const student = users.find((user) => user.id === studentId);
  const solution = solutions.find((item) => item.studentId === studentId);
  const [selectedId, setSelectedId] = useState(solution?.workDefinitions[0]?.id ?? '');
  const comments = readComments();
  const existingComment = comments.find((comment) => comment.studentId === studentId)?.text ?? '';
  const [comment, setComment] = useState(existingComment);
  const [saved, setSaved] = useState(false);
  const group = groups.find((item) => item.id === student?.groupId);
  const model = useMemo(() => {
    const built = buildWorkItemsFromDefinitions(solution?.workDefinitions ?? []);
    const schedule = built.errors.length ? { items: [], projectDuration: 0, errors: built.errors } : calculateSchedule(built.items);
    const errors = [...built.errors, ...schedule.errors];
    const usage = errors.length ? [] : calculateResourceUsage(schedule.items, initialScenario.resourceLimit);
    const metrics = errors.length ? null : getProjectMetrics(schedule.items, initialScenario.resourceLimit);
    return { errors, schedule, usage, metrics };
  }, [solution]);

  function saveComment() {
    const next = comments.filter((item) => item.studentId !== studentId);
    writeComments([...next, { studentId, text: comment, updatedAt: new Date().toISOString() }]);
    setSaved(true);
  }

  if (!student || !solution) {
    return (
      <PlatformShell role={role} title="Студент не найден" onLogout={onLogout}>
        <button className="button button--primary" type="button" onClick={onBack}>Назад к группе</button>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      role={role}
      title={`Проверка решения: ${student.name}`}
      subtitle={`${group?.title ?? 'Без группы'} · ${solution.status}`}
      onLogout={onLogout}
      actions={<button className="button button--primary" type="button" onClick={onBack}>Назад к группе</button>}
    >
      {model.metrics ? (
        <>
          <section className="panel review-hero">
            <div>
              <span className="course-chip">режим преподавателя</span>
              <h2>Анализ работы студента</h2>
              <p>Сравните решение с эталоном, посмотрите историю изменений, проверьте перегрузки и оставьте обратную связь.</p>
            </div>
            <div className="teacher-tools">
              <button className="button button--ghost" type="button">Сравнить с эталоном</button>
              <button className="button button--ghost" type="button">Вернуть на доработку</button>
              <button className="button button--primary" type="button">Выставить оценку</button>
            </div>
          </section>
          <MetricsCards metrics={model.metrics} />
          <WorkDefinitionTable
            definitions={solution.workDefinitions}
            scheduledItems={model.schedule.items}
            errors={model.errors}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={() => undefined}
            onAdd={() => undefined}
            onDelete={() => undefined}
            onClear={() => undefined}
            onRestore={() => undefined}
            onSave={() => undefined}
            onReset={() => undefined}
            readOnly
          />
          <div className="bottom-grid">
            <GanttChart items={model.schedule.items} projectDuration={model.metrics.projectDuration} selectedId={selectedId} onSelect={setSelectedId} />
            <ResourceChart usage={model.usage} resourceLimit={initialScenario.resourceLimit} />
          </div>
          <CalculationsTable items={model.schedule.items} selectedId={selectedId} onSelect={setSelectedId} />
          <section className="panel">
            <div className="panel__header"><h2>История изменений</h2><span>{solution.history.length}</span></div>
            <div className="table-wrap">
              <table><tbody>{solution.history.map((item) => <tr key={item.id}><td>{item.timestamp}</td><td>{item.workCode}</td><td>{item.field}</td><td>{item.oldValue} → {item.newValue}</td><td>{item.projectDurationBefore} → {item.projectDurationAfter}</td></tr>)}</tbody></table>
            </div>
          </section>
        </>
      ) : <section className="panel error-panel">{model.errors.map((error) => <p key={error.message}>{error.message}</p>)}</section>}
      <section className="panel comment-panel">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Комментарий преподавателя</h2>
            <p>Комментарий сохранится и будет виден студенту в его работе.</p>
          </div>
          {saved ? <span>Сохранено</span> : null}
        </div>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Напишите комментарий по решению студента" />
        <button className="button button--primary" type="button" onClick={saveComment}>Сохранить комментарий</button>
      </section>
    </PlatformShell>
  );
}
