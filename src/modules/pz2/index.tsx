import { useMemo, useState } from 'react';
import { ModuleStateProvider, useModuleState } from '../../bridge/context';
import { jsonFileDraftStorage } from '../../bridge/storage';
import { ModuleShell } from '../../shared/ui/ModuleShell';
import type { ModuleTaskStep } from '../../shared/ui/ModuleShell';
import { ExercisesStep } from './ExercisesStep';
import { PlanStep } from './PlanStep';
import { StagesStep } from './StagesStep';
import { WorksStep } from './WorksStep';
import {
  createInitialPz2Draft,
  createPz2Bridge,
  formatPz2Km,
  getPz2LengthCheck,
  getPz2RouteSource,
  getPz2SegmentMarks,
  getPz2StageWorks,
  isPz2PlanComplete,
  isPz2StagesComplete,
  isPz2WorksComplete,
  pz2StepIds,
  readPz2Position,
} from './model';
import { getPz2Plan, getPz2Report } from './plan';
import type { Pz2Draft } from './types';
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

function KsgTrainerStep() {
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
    <div className="ksg-module">
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
    </div>
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

/**
 * ПЗ2 — календарно-сетевой график.
 *
 * Задание опирается на трассу из ПЗ1: студент приносит сохранённый там файл,
 * меряет по нему участки и получает список работ. Поэтому модуль устроен так же,
 * как ПЗ1: интро с загрузкой файла, теория, шаги, итог.
 */
export function Pz2Module() {
  return (
    <ModuleStateProvider<Pz2Draft> initialDraft={createInitialPz2Draft()}>
      <Pz2Workspace />
    </ModuleStateProvider>
  );
}

function Pz2Workspace() {
  const { currentStepIndex, draft, importedBridge, phase, theorySeen } = useModuleState<Pz2Draft>();
  const source = getPz2RouteSource(importedBridge);

  const taskSteps: ModuleTaskStep[] = [
    {
      id: 'works',
      title: 'Работы по трассе',
      goal:
        'Пройдите линейкой по трассе и перечислите работы, которые нужно выполнить: их тип, длину и условия грунта. Сумма длин должна сойтись с длиной маршрута.',
      content: <WorksStep />,
      isComplete: isPz2WorksComplete(draft),
      completionHint: 'Добавьте хотя бы одну работу и заполните её длину или количество',
    },
    {
      id: 'stages',
      title: 'Разбиение на этапы',
      goal:
        'Разделите трассу на участки, которые строятся параллельно, и разнесите работы по ним: перетащите карточку работы в этап.',
      content: <StagesStep />,
      isComplete: isPz2StagesComplete(draft),
      completionHint: describeStagesHint(draft),
    },
    {
      id: 'exercises',
      title: 'Упражнения',
      goal:
        'Определите критический путь по сетевой диаграмме и разберитесь, как резервы работ позволяют выровнять число занятых людей во времени.',
      content: <ExercisesStep trainer={<KsgTrainerStep />} />,
    },
    {
      id: 'plan',
      title: 'Ресурсный график',
      goal:
        'Распределите рабочих по этапам так, чтобы потребность в людях была ровной: этапы строятся параллельно, и от раскладки зависят и срок, и загрузка.',
      content: <PlanStep />,
      isComplete: isPz2PlanComplete(draft),
      completionHint: 'Укажите общее число рабочих и назначьте людей на каждый этап',
    },
  ];

  return (
    <ModuleShell
      intro={<Pz2IntroStep />}
      introComplete={source.routeLine !== null}
      introCompletionHint="Загрузите файл, сохранённый в ПЗ1, — из него берутся трасса и длина маршрута"
      onSaveDraft={() =>
        jsonFileDraftStorage.save(
          // Позиция пишется стабильным id шага — как в ПЗ1: файл, сохранённый
          // до перестановки шагов, откроет тот же экран, а не тот же номер.
          createPz2Bridge(draft, importedBridge, {
            phase,
            stepId: pz2StepIds[currentStepIndex],
            theorySeen,
          }),
          'vsm-pz2-bridge.json',
        )
      }
      result={<Pz2ResultStep />}
      subtitle="Практическое задание № 2"
      taskSteps={taskSteps}
      theory={<Pz2TheoryStep />}
      title="Календарно-сетевой график строительства"
    />
  );
}

/** Сколько сегментов перенеслось и сколько из них кривые — видно сразу на интро. */
function describeSegments(segments: ReturnType<typeof getPz2SegmentMarks>) {
  const curves = segments.filter((segment) => segment.radiusM !== null).length;

  return curves > 0 ? `${segments.length}, из них кривых ${curves}` : String(segments.length);
}

function describeStagesHint(draft: Pz2Draft) {
  if (draft.stages.length === 0) {
    return 'Создайте хотя бы один этап';
  }

  const left = getPz2StageWorks(draft, null).length;

  return left > 0 ? `В пуле осталось работ: ${left}` : 'Добавьте работы на предыдущем шаге';
}

function Pz2IntroStep() {
  const { importedBridge, replaceDraft, setCurrentStepIndex, setImportedBridge, setTheorySeen } =
    useModuleState<Pz2Draft>();
  const [importError, setImportError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const source = getPz2RouteSource(importedBridge);

  async function importBridgeFile(file: File) {
    try {
      const bridge = await jsonFileDraftStorage.load(file);

      if (!bridge.completed?.pz1?.routeLine) {
        setImportedBridge(null);
        setImportStatus('');
        setImportError('В этом файле нет трассы из ПЗ1. Загрузите файл, сохранённый в первом задании.');
        return;
      }

      setImportedBridge(bridge);
      // Возвращаем и данные, и место, на котором студент сохранился: файл ПЗ2
      // открывает тот же экран с уже введёнными работами и этапами.
      replaceDraft(createInitialPz2Draft(bridge));
      setImportError('');

      const position = readPz2Position(bridge);

      if (position) {
        // Фазу не переключаем — студент остаётся на интро и возвращается в
        // задание сам, как и в ПЗ1.
        setTheorySeen(position.theorySeen);
        setCurrentStepIndex(position.stepIndex);
        setImportStatus(
          `Загружен файл: ${file.name}. «Начать» вернёт на шаг ${position.stepIndex + 1} из ${pz2StepIds.length}.`,
        );
        return;
      }

      setImportStatus(`Загружен файл: ${file.name}`);
    } catch (error) {
      setImportStatus('');
      setImportError(error instanceof Error ? error.message : 'Не удалось загрузить файл.');
    }
  }

  return (
    <div className="intro-layout">
      <section className="form-section">
        <p className="eyebrow">Исходные данные</p>
        <h2>Трасса из первого задания</h2>
        <p>
          Второе задание продолжает первое: работы считаются по той линии ВСМ, которую вы уже проложили. Загрузите файл,
          сохранённый в ПЗ1, — из него берутся сама трасса и длина маршрута.
        </p>
        <label
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files.item(0);
            if (file) {
              void importBridgeFile(file);
            }
          }}
        >
          <input
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);
              if (file) {
                void importBridgeFile(file);
              }
              event.currentTarget.value = '';
            }}
            type="file"
          />
          <span>Выберите JSON-файл ПЗ1 или перенесите его сюда</span>
        </label>
        {importStatus ? <p className="status-note">{importStatus}</p> : null}
        {importError ? <p className="status-note status-note--error">{importError}</p> : null}
      </section>

      <section className="forecast-summary-panel">
        <p className="eyebrow">Что прочитано из файла</p>
        <h3>Проверка</h3>
        {source.routeLine ? (
          <dl className="forecast-summary-grid forecast-summary-grid--compact">
            <div>
              <dt>Длина маршрута</dt>
              <dd>{formatPz2Km(source.totalLengthKm)}</dd>
            </div>
            <div>
              <dt>Станций</dt>
              <dd>{source.stations.length}</dd>
            </div>
            <div>
              <dt>Точек линии</dt>
              <dd>{source.routeLine.vertices.length}</dd>
            </div>
            <div>
              <dt>Сегментов</dt>
              <dd>{describeSegments(getPz2SegmentMarks(source))}</dd>
            </div>
          </dl>
        ) : (
          <p className="status-note">Файл пока не загружен.</p>
        )}
      </section>
    </div>
  );
}

function Pz2TheoryStep() {
  return (
    <div className="theory-layout">
      <p>
        Чтобы построить линию, её сначала разбирают на работы: где-то ремонтируют существующий путь, где-то насыпают
        земляное полотно, где-то нужны эстакада, мост или тоннель. У каждой работы есть тип и длина — из них потом
        складывается список работ.
      </p>
      <p>
        Длину участков меряют по карте. Неточности неизбежны, поэтому в конце сумма участков сверяется с длиной
        маршрута: расхождение показывает, что часть трассы осталась без работ или что участки наложились друг на
        друга.
      </p>
      <p>
        Отдельно считают работы, у которых длины нет, — например стрелочные переводы: они меряются штуками.
      </p>
    </div>
  );
}

/**
 * Отчёт по проекту (ТЗ ПЗ2 §9): материалы, человеко-часы, машино-часы.
 *
 * Считается по тем же нормативам, что и сроки на экране 04, поэтому цифры
 * отчёта и графика сходятся между собой. Черновой характер нормативов сказан
 * прямо: заказчик разрешил их сгенерировать и передал на проверку эксперту.
 */
function Pz2ReportSection() {
  const { draft, importedBridge } = useModuleState<Pz2Draft>();
  const source = getPz2RouteSource(importedBridge);
  const report = getPz2Report(draft);
  const plan = getPz2Plan(
    draft,
    draft.stages.map((stage) => ({
      stageId: stage.id,
      workers: Number(draft.workersByStage[stage.id]?.replace(/[^0-9]/g, '') || 0),
    })),
    Number(draft.totalWorkers.replace(/[^0-9]/g, '') || 0),
  );

  if (report.laborHours === 0) {
    return (
      <section className="form-section">
        <p className="eyebrow">Отчёт</p>
        <h3>Материалы, человеко-часы и машино-часы</h3>
        <p className="status-note">
          Отчёт считается по работам с длиной или количеством. Пока таких работ нет, считать нечего.
        </p>
      </section>
    );
  }

  return (
    <section className="form-section">
      <p className="eyebrow">Отчёт</p>
      <h3>Материалы, человеко-часы и машино-часы</h3>

      <dl className="forecast-summary-grid forecast-summary-grid--compact">
        <div>
          <dt>Трудоёмкость</dt>
          <dd>{formatAmount(report.laborHours)} чел.-ч</dd>
        </div>
        <div>
          <dt>Машино-часы</dt>
          <dd>{formatAmount(report.machineHours)} маш.-ч</dd>
        </div>
        <div>
          <dt>Срок по графику</dt>
          <dd>{plan.metrics.projectDuration > 0 ? `${plan.metrics.projectDuration} дн.` : 'не рассчитан'}</dd>
        </div>
        <div>
          <dt>Длина маршрута</dt>
          <dd>{formatPz2Km(source.totalLengthKm)}</dd>
        </div>
      </dl>

      <div className="report-columns">
        <ReportTable caption="Материалы" rows={report.materials} />
        <ReportTable caption="Машины" rows={report.machines} />
      </div>

      <p className="status-note">
        Нормативы расхода — черновые. Заказчик разрешил сгенерировать их, чтобы не задерживать работу (ТЗ §9), и передал
        на проверку эксперту: числа поменяются, способ расчёта — нет.
      </p>
    </section>
  );
}

function ReportTable({ caption, rows }: { caption: string; rows: ReturnType<typeof getPz2Report>['materials'] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="table-scroll">
      <table className="input-table">
        <caption className="eyebrow">{caption}</caption>
        <thead>
          <tr>
            <th>Позиция</th>
            <th className="numeric">Количество</th>
            <th>Единица</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.title}>
              <th scope="row">{row.title}</th>
              <td className="numeric">{formatAmount(row.amount)}</td>
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function Pz2ResultStep() {
  const { draft, importedBridge } = useModuleState<Pz2Draft>();
  const source = getPz2RouteSource(importedBridge);
  const check = getPz2LengthCheck(draft, source.totalLengthKm);
  const inPool = getPz2StageWorks(draft, null).length;

  return (
    <div className="result-layout">
      <section className="form-section">
        <p className="eyebrow">Итог</p>
        <h2>Работ по трассе: {draft.works.length}</h2>

        <dl className="forecast-summary-grid forecast-summary-grid--compact">
          <div>
            <dt>Намерено</dt>
            <dd>{formatPz2Km(check.measuredKm)}</dd>
          </div>
          <div>
            <dt>Маршрут из ПЗ1</dt>
            <dd>{formatPz2Km(check.routeKm)}</dd>
          </div>
          <div>
            <dt>Этапов</dt>
            <dd>{draft.stages.length}</dd>
          </div>
        </dl>

        {draft.stages.length > 0 ? (
          <ul className="stage-list">
            {draft.stages.map((stage) => {
              const works = getPz2StageWorks(draft, stage.id);

              return (
                <li className="stage-card" key={stage.id}>
                  <div className="stage-card__head">
                    <h4>{stage.title}</h4>
                    <span className="stage-card__meta">Работ: {works.length}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {inPool > 0 ? <p className="field-warning">В пуле осталось работ: {inPool}</p> : null}
      </section>

      <Pz2ReportSection />
    </div>
  );
}
