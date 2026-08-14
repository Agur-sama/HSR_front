import { useMemo, useState } from 'react';
import { CalculationsTable } from '../../components/CalculationsTable/CalculationsTable';
import { DependencyChart } from '../../components/DependencyChart/DependencyChart';
import { GanttChart } from '../../components/GanttChart/GanttChart';
import { MetricsCards } from '../../components/MetricsCards/MetricsCards';
import { ResourceChart } from '../../components/ResourceChart/ResourceChart';
import { WorkDefinitionTable } from '../../components/WorkDefinitionTable/WorkDefinitionTable';
import { WorkEditor } from '../../components/WorkEditor/WorkEditor';
import {
  buildWorkItemsFromDefinitions,
  calculateResourceUsage,
  calculateResourceUsageWithFloat,
  calculateSchedule,
  getProjectMetrics,
  recalculateDefinition,
} from '../../domain/network/calculations';
import { defaultWorkDefinitions, initialScenario } from '../../domain/network/mockData';
import type { ProjectMetrics, WorkDefinition } from '../../domain/network/types';

const emptyMetrics: ProjectMetrics = {
  projectDuration: 0,
  maxWorkers: 0,
  averageWorkers: 0,
  criticalCount: 0,
  floatCount: 0,
  overloadDays: 0,
  idleDays: 0,
  efficiency: 0,
};

export function Pz2Module() {
  const [definitions, setDefinitions] = useState<WorkDefinition[]>(() => cloneDefinitions(defaultWorkDefinitions));
  const [savedDefinitions, setSavedDefinitions] = useState<WorkDefinition[]>(() => cloneDefinitions(defaultWorkDefinitions));
  const [selectedId, setSelectedId] = useState(defaultWorkDefinitions[0]?.id ?? '');
  const [notice, setNotice] = useState('Измените определитель работ, чтобы увидеть пересчёт графика и загрузки.');

  const model = useMemo(() => {
    const built = buildWorkItemsFromDefinitions(definitions);
    const schedule = built.errors.length ? { items: [], projectDuration: 0, errors: built.errors } : calculateSchedule(built.items);
    const errors = [...built.errors, ...schedule.errors];

    if (errors.length > 0) {
      return {
        built,
        errors,
        metrics: emptyMetrics,
        schedule,
        usage: [],
        usageWithFloat: [],
      };
    }

    return {
      built,
      errors,
      metrics: getProjectMetrics(schedule.items, initialScenario.resourceLimit),
      schedule,
      usage: calculateResourceUsage(schedule.items, initialScenario.resourceLimit),
      usageWithFloat: calculateResourceUsageWithFloat(schedule.items, initialScenario.resourceLimit),
    };
  }, [definitions]);

  const selectedWork = model.schedule.items.find((item) => item.id === selectedId) ?? model.schedule.items[0];
  const selectedError = model.errors.find((error) => error.workId === selectedId)?.message;

  function updateDefinition(id: string, field: keyof WorkDefinition, value: string | number) {
    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((definition) => {
        if (definition.id !== id) {
          return definition;
        }

        const changed = { ...definition, [field]: value };
        return recalculateDefinition(field === 'duration' ? { ...changed, calculationMode: 'manual-duration' } : changed);
      }),
    );
    setNotice('График пересчитан по текущему определителю работ.');
  }

  function addWork() {
    const selectedIndex = definitions.findIndex((definition) => definition.id === selectedId);
    const insertAfterIndex = selectedIndex >= 0 ? selectedIndex : definitions.length - 1;
    const anchor = insertAfterIndex >= 0 ? definitions[insertAfterIndex] : undefined;
    const from = anchor?.to ?? '1';
    const nextWork: WorkDefinition = {
      id: createWorkId(),
      calculationMode: 'fixed-labor',
      code: `${definitions.length + 1}`,
      duration: 2,
      from,
      labor: 4,
      plannedShift: 0,
      title: 'Новая работа',
      to: getNextEventValue(from, definitions),
      workers: 2,
    };
    const nextDefinitions = [
      ...definitions.slice(0, insertAfterIndex + 1),
      nextWork,
      ...definitions.slice(insertAfterIndex + 1),
    ];

    setDefinitions(nextDefinitions.map(recalculateDefinition));
    setSelectedId(nextWork.id);
    setNotice('Добавлена новая работа. Проверьте начало и окончание события.');
  }

  function deleteWork(id: string) {
    setDefinitions((currentDefinitions) => currentDefinitions.filter((definition) => definition.id !== id));
    setSelectedId((currentSelectedId) => {
      if (currentSelectedId !== id) {
        return currentSelectedId;
      }

      const nextDefinition = definitions.find((definition) => definition.id !== id);
      return nextDefinition?.id ?? '';
    });
    setNotice('Работа удалена из определителя.');
  }

  function clearDefinitions() {
    setDefinitions([]);
    setSelectedId('');
    setNotice('Таблица очищена. Добавьте работу или восстановите пример.');
  }

  function restoreExample() {
    const restoredDefinitions = cloneDefinitions(defaultWorkDefinitions);
    setDefinitions(restoredDefinitions);
    setSavedDefinitions(restoredDefinitions);
    setSelectedId(restoredDefinitions[0]?.id ?? '');
    setNotice('Восстановлен учебный пример сетевого графика.');
  }

  function saveCurrentDefinitions() {
    setSavedDefinitions(cloneDefinitions(definitions));
    setNotice(`Состояние зафиксировано в этой вкладке: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`);
  }

  function resetToSavedDefinitions() {
    const restoredDefinitions = cloneDefinitions(savedDefinitions);
    setDefinitions(restoredDefinitions);
    setSelectedId(restoredDefinitions[0]?.id ?? '');
    setNotice('Вернули состояние к последнему сохранению в этой вкладке.');
  }

  return (
    <main className="ksg-module">
      <header className="ksg-header">
        <div>
          <p className="eyebrow">ПЗ2</p>
          <h1>Календарно-сетевой график</h1>
          <p>{initialScenario.description}</p>
        </div>
        <nav className="ksg-nav" aria-label="Практические задания">
          <a href="/?pz=1">ПЗ1: карта</a>
          <a aria-current="page" href="/?pz=2">
            ПЗ2: КСГ
          </a>
        </nav>
      </header>

      <section className="ksg-notice" aria-live="polite">
        {notice}
      </section>

      <MetricsCards metrics={model.metrics} />

      <WorkDefinitionTable
        definitions={definitions}
        errors={model.errors}
        onAdd={addWork}
        onChange={updateDefinition}
        onClear={clearDefinitions}
        onDelete={deleteWork}
        onReset={resetToSavedDefinitions}
        onRestore={restoreExample}
        onSave={saveCurrentDefinitions}
        onSelect={setSelectedId}
        scheduledItems={model.schedule.items}
        selectedId={selectedId}
      />

      {model.errors.length > 0 ? (
        <ErrorPanel errors={model.errors.map((error) => error.message)} />
      ) : selectedWork ? (
        <>
          <section className="ksg-simulator-layout">
            <GanttChart
              items={model.schedule.items}
              onSelect={setSelectedId}
              onShiftChange={(id, shift) => updateDefinition(id, 'plannedShift', shift)}
              projectDuration={model.schedule.projectDuration}
              selectedId={selectedWork.id}
            />
            <aside className="ksg-right-rail">
              <WorkEditor
                error={selectedError}
                onDurationChange={(duration) => updateDefinition(selectedWork.id, 'duration', duration)}
                onShiftChange={(shift) => updateDefinition(selectedWork.id, 'plannedShift', shift)}
                onWorkersChange={(workers) => updateDefinition(selectedWork.id, 'workers', workers)}
                work={selectedWork}
              />
              <DependencyChart selectedWork={selectedWork} workItems={model.built.items} />
            </aside>
          </section>

          <section className="ksg-chart-grid">
            <ResourceChart
              description="Фактическая загрузка по ранним срокам сетевого графика."
              resourceLimit={initialScenario.resourceLimit}
              title="Столбчатая диаграмма загрузки"
              usage={model.usage}
            />
            <ResourceChart
              description="Распределение работ с учётом доступных резервов."
              resourceLimit={initialScenario.resourceLimit}
              title="Загрузка с учётом резервов"
              usage={model.usageWithFloat}
            />
          </section>

          <CalculationsTable items={model.schedule.items} onSelect={setSelectedId} selectedId={selectedWork.id} />
        </>
      ) : null}
    </main>
  );
}

function ErrorPanel({ errors }: { errors: string[] }) {
  return (
    <section className="panel ksg-error-panel">
      <div className="panel__header panel__header--stacked">
        <div>
          <h2>График пока не строится</h2>
          <p>Исправьте определитель работ, и диаграмма Ганта появится автоматически.</p>
        </div>
      </div>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </section>
  );
}

function cloneDefinitions(definitions: WorkDefinition[]) {
  return definitions.map((definition) => ({ ...definition }));
}

function createWorkId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `work-${Date.now()}`;
}

function getNextEventValue(from: string, definitions: WorkDefinition[]) {
  const numericEvents = definitions
    .flatMap((definition) => [definition.from, definition.to])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (Number.isFinite(Number(from))) {
    return String(Number(from) + 1);
  }

  return String(Math.max(0, ...numericEvents) + 1);
}
