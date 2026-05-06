import { useEffect, useMemo, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import { CalculationsTable } from '../../components/CalculationsTable/CalculationsTable';
import { DependencyChart } from '../../components/DependencyChart/DependencyChart';
import { GanttChart } from '../../components/GanttChart/GanttChart';
import { PlatformShell } from '../../components/Layout/PlatformShell';
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
import type { AppUser, ChangeRecord, ProjectMetrics, UserRole, WorkDefinition } from '../../domain/network/types';
import { cloneDefinitions, createDefaultSolution, readComments, readSolutions, writeSolutions } from '../../utils/storage';

type StudentSimulatorPageProps = {
  role: UserRole;
  user: AppUser;
  onLogout: () => void;
};

type StudentTab = 'overview' | 'theory' | 'simulator' | 'calculations' | 'result' | 'history' | 'comments';

const tabs: Array<{ id: StudentTab; label: string }> = [
  { id: 'overview', label: 'Обзор задания' },
  { id: 'theory', label: 'Теория' },
  { id: 'simulator', label: 'Симулятор' },
  { id: 'calculations', label: 'Расчёты' },
  { id: 'result', label: 'Анализ результата' },
  { id: 'history', label: 'История изменений' },
  { id: 'comments', label: 'Комментарии преподавателя' },
];

export function StudentSimulatorPage({ role, user, onLogout }: StudentSimulatorPageProps) {
  const savedSolution = readSolutions().find((solution) => solution.studentId === user.id) ?? createDefaultSolution(user.id);
  const [definitions, setDefinitions] = useState<WorkDefinition[]>(() => cloneDefinitions(savedSolution.workDefinitions));
  const [savedDefinitions, setSavedDefinitions] = useState<WorkDefinition[]>(() => cloneDefinitions(savedSolution.workDefinitions));
  const [history, setHistory] = useState<ChangeRecord[]>(savedSolution.history);
  const [selectedId, setSelectedId] = useState(definitions[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [notice, setNotice] = useState('Измените таблицу, чтобы увидеть влияние на график и результат.');
  const [savedMessage, setSavedMessage] = useState(savedSolution.savedAt ? `Последнее сохранение: ${new Date(savedSolution.savedAt).toLocaleString('ru-RU')}` : '');
  const [backendSolutionId, setBackendSolutionId] = useState<string | number | null>(null);
  const [backendEnabled, setBackendEnabled] = useState(false);
  const [apiError, setApiError] = useState('');
  const teacherComment = readComments().find((comment) => comment.studentId === user.id);

  useEffect(() => {
    studentApi.assignments()
      .then((assignments: any) => {
        const firstAssignment = Array.isArray(assignments) ? assignments[0] : null;
        if (!firstAssignment) return null;
        return studentApi.assignment(firstAssignment.id);
      })
      .then((payload: any) => {
        if (!payload?.solution) return;
        const loaded = mapBackendWorks(payload.solution.works ?? []);
        setDefinitions(loaded);
        setSavedDefinitions(cloneDefinitions(loaded));
        setHistory(mapBackendHistory(payload.solution.history ?? []));
        setBackendSolutionId(payload.solution.id);
        setBackendEnabled(true);
        setApiError('');
        setNotice('Решение загружено из базы данных.');
      })
      .catch(() => {
        setBackendEnabled(false);
        setApiError('Backend недоступен: временно используется локальный учебный режим.');
      });
  }, [user.id]);

  const baseSchedule = useMemo(() => {
    const baseItems = buildWorkItemsFromDefinitions(defaultWorkDefinitions);
    return calculateSchedule(baseItems.items);
  }, []);
  const baseMetrics = useMemo(
    () => getProjectMetrics(baseSchedule.items, initialScenario.resourceLimit),
    [baseSchedule.items],
  );

  const model = useMemo(() => {
    const built = buildWorkItemsFromDefinitions(definitions);
    const schedule = built.errors.length ? { items: [], projectDuration: 0, errors: built.errors } : calculateSchedule(built.items);
    const allErrors = [...built.errors, ...schedule.errors];
    const usage = allErrors.length ? [] : calculateResourceUsage(schedule.items, initialScenario.resourceLimit);
    const usageWithFloat = allErrors.length ? [] : calculateResourceUsageWithFloat(schedule.items, initialScenario.resourceLimit);
    const metrics = allErrors.length ? emptyMetrics() : getProjectMetrics(schedule.items, initialScenario.resourceLimit);
    return { built, schedule, errors: allErrors, usage, usageWithFloat, metrics };
  }, [definitions]);

  const selectedWork = model.schedule.items.find((item) => item.id === selectedId) ?? model.schedule.items[0];
  const selectedDefinition = definitions.find((definition) => definition.id === selectedId);

  function persist(nextDefinitions: WorkDefinition[], nextHistory = history, status = savedSolution.status) {
    const solutions = readSolutions();
    const nextSolution = {
      ...savedSolution,
      studentId: user.id,
      assignmentId: savedSolution.assignmentId,
      status,
      workDefinitions: nextDefinitions,
      history: nextHistory,
      savedAt: new Date().toISOString(),
    };
    const withoutCurrent = solutions.filter((solution) => solution.studentId !== user.id);
    writeSolutions([...withoutCurrent, nextSolution]);
  }

  function updateDefinitions(nextDefinitions: WorkDefinition[], message: string, record?: ChangeRecord) {
    const normalized = nextDefinitions.map(recalculateDefinition);
    const nextHistory = record ? [record, ...history].slice(0, 40) : history;
    setDefinitions(normalized);
    setHistory(nextHistory);
    setNotice(message);
    setSavedMessage('');
    persist(normalized, nextHistory, 'В работе');
  }

  function recordChange(
    beforeDefinitions: WorkDefinition[],
    afterDefinitions: WorkDefinition[],
    changedWork: WorkDefinition,
    field: string,
    oldValue: string | number,
    newValue: string | number,
  ): ChangeRecord {
    const before = metricsForDefinitions(beforeDefinitions);
    const after = metricsForDefinitions(afterDefinitions);
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('ru-RU'),
      workCode: changedWork.code || 'Новая работа',
      field,
      oldValue,
      newValue,
      projectDurationBefore: before.projectDuration,
      projectDurationAfter: after.projectDuration,
      maxWorkersBefore: before.maxWorkers,
      maxWorkersAfter: after.maxWorkers,
    };
  }

  function changeDefinition(id: string, field: keyof WorkDefinition, value: string | number) {
    const before = definitions;
    const current = before.find((definition) => definition.id === id);
    if (!current) return;

    const next = before.map((definition) => {
      if (definition.id !== id) return definition;
      const changed = { ...definition, [field]: value };
      return field === 'duration' ? { ...changed, calculationMode: 'manual-duration' as const } : changed;
    });
    const normalizedNext = next.map(recalculateDefinition);
    const changed = normalizedNext.find((definition) => definition.id === id) ?? current;
    const record = recordChange(
      before,
      normalizedNext,
      changed,
      fieldLabel(field),
      displayHistoryValue(current[field] ?? ''),
      displayHistoryValue(value),
    );
    updateDefinitions(normalizedNext, buildChangeNotice(before, normalizedNext), record);
  }

  function addWork() {
    const selectedIndex = definitions.findIndex((definition) => definition.id === selectedId);
    const insertAfterIndex = selectedIndex >= 0 ? selectedIndex : definitions.length - 1;
    const anchor = insertAfterIndex >= 0 ? definitions[insertAfterIndex] : undefined;
    const from = anchor?.to ?? '1';
    const nextWork: WorkDefinition = {
      id: crypto.randomUUID(),
      code: `${definitions.length + 1}`,
      from,
      to: getNextEventValue(from, definitions),
      title: 'Новая работа',
      labor: 4,
      workers: 2,
      duration: 2,
      calculationMode: 'fixed-labor',
    };
    const shiftedDefinitions = definitions.map((definition) =>
      anchor && definition.id !== anchor.id && definition.from.trim() === from.trim()
        ? { ...definition, from: nextWork.to }
        : definition,
    );
    const nextDefinitions = [
      ...shiftedDefinitions.slice(0, insertAfterIndex + 1),
      nextWork,
      ...shiftedDefinitions.slice(insertAfterIndex + 1),
    ];
    updateDefinitions(nextDefinitions, 'Добавлена новая работа после выбранной строки. Событие начала уже заполнено; при необходимости измените начало и окончание в таблице.');
    setSelectedId(nextWork.id);
  }

  function deleteWork(id: string) {
    const removed = definitions.find((definition) => definition.id === id);
    const next = definitions.filter((definition) => definition.id !== id);
    updateDefinitions(next, removed ? `Работа ${removed.code} удалена из определителя.` : 'Работа удалена.');
    setSelectedId(next[0]?.id ?? '');
  }

  async function saveSolution() {
    if (backendEnabled && backendSolutionId) {
      try {
        await syncDefinitionsToBackend(backendSolutionId, savedDefinitions, definitions);
        const payload: any = await studentApi.solution(backendSolutionId);
        const loaded = mapBackendWorks(payload.solution.works ?? []);
        setDefinitions(loaded);
        setSavedDefinitions(cloneDefinitions(loaded));
        setHistory(mapBackendHistory(payload.solution.history ?? []));
        setSavedMessage(`Работа сохранена в базе данных: ${new Date().toLocaleString('ru-RU')}`);
        setNotice('Работа сохранена. Backend пересчитал сетевой график, метрики и историю.');
        setApiError('');
        return;
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Не удалось сохранить работу на backend.');
      }
    }

    persist(definitions, history, 'Завершено');
    setSavedDefinitions(cloneDefinitions(definitions));
    setNotice('Решение сохранено. Учитель увидит этот вариант таблицы, графиков и расчётов.');
    setSavedMessage(`Решение сохранено: ${new Date().toLocaleString('ru-RU')}`);
  }

  function resetUnsaved() {
    setDefinitions(cloneDefinitions(savedDefinitions));
    setNotice('Изменения сброшены к последнему сохраненному варианту.');
  }

  function restoreExample() {
    updateDefinitions(cloneDefinitions(defaultWorkDefinitions), 'Восстановлен учебный пример по умолчанию.');
    setSelectedId(defaultWorkDefinitions[0].id);
  }

  return (
    <PlatformShell
      role={role}
      title="КСГ: текущий ремонт условного объекта"
      subtitle="Научитесь строить сетевой график, находить критический путь и оптимизировать сроки проекта"
      onLogout={onLogout}
      actions={<button className="button button--primary" type="button" onClick={saveSolution}>Сохранить решение</button>}
    >
      <CourseHero
        role={role}
        activeTab={activeTab}
        status={savedSolution.status}
        savedMessage={savedMessage}
        metrics={model.metrics}
        errorsCount={model.errors.length}
        onSave={saveSolution}
      />

      <nav className="tabs learning-tabs" aria-label="Разделы учебного модуля">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? 'is-active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <OverviewTab metrics={model.metrics} errorsCount={model.errors.length} />
      ) : null}
      {activeTab === 'theory' ? <TheoryTab /> : null}
      {activeTab === 'simulator' ? (
        <SimulatorTab
          definitions={definitions}
          scheduledItems={model.schedule.items}
          errors={model.errors}
          usage={model.usage}
          usageWithFloat={model.usageWithFloat}
          metrics={model.metrics}
          baseMetrics={baseMetrics}
          selectedId={selectedId}
          selectedWork={selectedWork}
          notice={notice}
          savedMessage={savedMessage}
          onSelect={setSelectedId}
          onChange={changeDefinition}
          onAdd={addWork}
          onDelete={deleteWork}
          onClear={() => updateDefinitions([], 'Таблица очищена. Добавьте хотя бы одну работу, чтобы построить график.')}
          onRestore={restoreExample}
          onSave={saveSolution}
          onReset={resetUnsaved}
          teacherComment={teacherComment?.text}
          apiError={apiError}
          backendEnabled={backendEnabled}
        />
      ) : null}
      {activeTab === 'calculations' ? (
        <CalculationsContent items={model.schedule.items} errors={model.errors} selectedId={selectedId} onSelect={setSelectedId} metrics={model.metrics} />
      ) : null}
      {activeTab === 'result' ? (
        <ResultTab current={model.metrics} base={baseMetrics} errorsCount={model.errors.length} recommendations={recommendations(model.metrics, baseMetrics, selectedWork)} />
      ) : null}
      {activeTab === 'history' ? <HistoryTab history={history} /> : null}
      {activeTab === 'comments' ? <StudentCommentsTab comment={teacherComment?.text} savedMessage={savedMessage} /> : null}
      {selectedDefinition ? null : null}
    </PlatformShell>
  );
}

type SimulatorTabProps = {
  definitions: WorkDefinition[];
  scheduledItems: ReturnType<typeof calculateSchedule>['items'];
  errors: ReturnType<typeof buildWorkItemsFromDefinitions>['errors'];
  usage: ReturnType<typeof calculateResourceUsage>;
  usageWithFloat: ReturnType<typeof calculateResourceUsage>;
  metrics: ProjectMetrics;
  baseMetrics: ProjectMetrics;
  selectedId: string;
  selectedWork?: ReturnType<typeof calculateSchedule>['items'][number];
  notice: string;
  savedMessage: string;
  onSelect: (id: string) => void;
  onChange: (id: string, field: keyof WorkDefinition, value: string | number) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onRestore: () => void;
  onSave: () => void;
  onReset: () => void;
  teacherComment?: string;
  apiError?: string;
  backendEnabled: boolean;
};

function CourseHero({
  role,
  activeTab,
  status,
  savedMessage,
  metrics,
  errorsCount,
  onSave,
}: {
  role: UserRole;
  activeTab: StudentTab;
  status: string;
  savedMessage: string;
  metrics: ProjectMetrics;
  errorsCount: number;
  onSave: () => void;
}) {
  const steps = [
    { id: 'overview', label: 'Изучить задание' },
    { id: 'theory', label: 'Разобрать теорию' },
    { id: 'simulator', label: 'Заполнить работы' },
    { id: 'calculations', label: 'Проверить расчёты' },
    { id: 'result', label: 'Сохранить результат' },
  ];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeTab));
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <section className="course-hero">
      <div className="course-hero__content">
        <span className="course-chip">Интерактивный модуль · КСГ</span>
        <h2>Текущий ремонт условного объекта</h2>
        <p>Пройдите учебный сценарий: разберите теорию, заполните определитель работ, постройте график, оптимизируйте ресурсы и сохраните решение для преподавателя.</p>
        <div className="course-meta">
          <span>Роль: {role === 'student' ? 'студент' : role === 'teacher' ? 'преподаватель' : 'админ'}</span>
          <span>Статус: {normalizeStatus(status)}</span>
          <span>Ошибки: {errorsCount}</span>
          <span>Срок проекта: {metrics.projectDuration} дн.</span>
        </div>
      </div>
      <div className="course-hero__side">
        <div className="progress-card">
          <div className="progress-card__top">
            <strong>{progress}%</strong>
            <span>{savedMessage ? 'Решение сохранено' : 'Черновик в работе'}</span>
          </div>
          <div className="progress-line"><i style={{ width: `${progress}%` }} /></div>
          <button className="button button--primary" type="button" onClick={onSave}>Сохранить решение</button>
        </div>
      </div>
      <div className="learning-steps">
        {steps.map((step, index) => (
          <div key={step.id} className={`learning-step ${index <= activeIndex ? 'is-active' : ''}`}>
            <b>{index + 1}</b>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewTab({ metrics, errorsCount }: { metrics: ProjectMetrics; errorsCount: number }) {
  return (
    <div className="overview-layout">
      <section className="panel assignment-card">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Обзор задания</h2>
            <p>Вы работаете как планировщик проекта: задаете работы, проверяете сетевые зависимости и ищете более устойчивое решение.</p>
          </div>
          <span>Максимум: 100 баллов</span>
        </div>
        <div className="assignment-grid">
          <article><b>Цель работы</b><p>Построить корректный сетевой график и найти критический путь.</p></article>
          <article><b>Что нужно сделать</b><p>Заполнить работы, события, трудоемкость и исполнителей, затем оптимизировать срок.</p></article>
          <article><b>Критерии оценки</b><p>Корректные зависимости, отсутствие ошибок, понятная оптимизация и сохраненный результат.</p></article>
          <article><b>Ожидаемый результат</b><p>График Ганта, расчет ранних/поздних сроков, занятость ресурсов и рекомендации.</p></article>
          <article><b>Ограничение ресурсов</b><p>Лимит сотрудников: {initialScenario.resourceLimit} чел.</p></article>
          <article><b>Дедлайн</b><p>Учебный дедлайн: до конца практического занятия.</p></article>
        </div>
      </section>
      <section className="panel check-card">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Что проверяет преподаватель</h2>
            <p>Система помогает увидеть слабые места до отправки решения.</p>
          </div>
        </div>
        <ul className="check-list">
          <li>корректность сетевого графика и событий;</li>
          <li>правильность критического пути;</li>
          <li>перегрузку сотрудников относительно лимита;</li>
          <li>обоснованность оптимизации;</li>
          <li>итоговый срок проекта и динамику изменений.</li>
        </ul>
        <div className="mini-result">
          <span>Текущий срок: <b>{metrics.projectDuration} дн.</b></span>
          <span>Ошибки в данных: <b>{errorsCount}</b></span>
        </div>
      </section>
    </div>
  );
}

function TheoryTab() {
  const cards = [
    ['Сетевой график', 'Модель проекта, где работы связаны событиями. Он показывает, что должно завершиться раньше, а что может идти параллельно.'],
    ['Критический путь', 'Самая длинная цепочка зависимых работ. Если задержать работу на этом пути, задержится весь проект.'],
    ['Резерв времени', 'Запас, на который некритическую работу можно сдвинуть или растянуть без увеличения общего срока.'],
    ['Перегрузка ресурсов', 'Ситуация, когда в один день требуется больше сотрудников, чем доступно по лимиту.'],
    ['Оптимизация срока', 'Сначала ищите критические работы: сокращение некритических работ не всегда уменьшает общий срок.'],
    ['Почему нельзя сокращать всё', 'У каждой работы есть трудоёмкость. Простое уменьшение длительности без ресурсов делает план нереалистичным.'],
  ];

  return (
    <section className="panel theory-panel">
      <div className="panel__header panel__header--stacked">
        <div>
          <h2>Теория перед практикой</h2>
          <p>Короткие карточки помогают читать график как учебную модель, а не как набор чисел.</p>
        </div>
      </div>
      <div className="theory-grid">
        {cards.map(([title, text], index) => (
          <article key={title} className="theory-card">
            <span>{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="formula-box">
        <h3>Базовые формулы</h3>
        <p>Продолжительность = округление вверх(трудоёмкость / количество исполнителей)</p>
        <p>Полный резерв = позднее начало - раннее начало</p>
        <p>Эффективность = средняя занятость / лимит сотрудников × 100%</p>
      </div>
    </section>
  );
}

function SimulatorTab(props: SimulatorTabProps) {
  return (
    <>
      <div className="learning-grid learning-grid--wide">
        <section className="panel info-card info-card--accent">
          <span>Учебная цель</span>
          <h2>От таблицы к решению</h2>
          <p>Проверьте причинную цепочку: исполнители → длительность → сетевой график → критический путь → ресурсы → итоговая оценка.</p>
        </section>
        <section className="panel info-card">
          <span>Практическое действие</span>
          <h2>Редактируйте определитель</h2>
          <p>Меняйте события, трудоёмкость и исполнителей. Графики и расчёты обновятся автоматически.</p>
        </section>
        <section className="panel info-card">
          <span>Подсказка</span>
          <h2>Оптимизируйте осознанно</h2>
          <p>Критические работы влияют на срок, а работы с резервом помогают выравнивать занятость.</p>
        </section>
      </div>

      {props.teacherComment ? (
        <section className="panel teacher-comment-card">
          <div className="panel__header">
            <h2>Комментарий учителя</h2>
            <span>к вашей работе</span>
          </div>
          <p>{props.teacherComment}</p>
        </section>
      ) : null}

      {props.savedMessage ? (
        <section className="save-banner" role="status" aria-live="polite">
          <strong>Сохранено</strong>
          <span>{props.savedMessage}. Можно закрыть страницу или перейти к результату.</span>
        </section>
      ) : null}

      {props.apiError ? (
        <section className="panel error-panel">
          <p>{props.apiError}</p>
        </section>
      ) : null}

      <WorkDefinitionTable {...props} />

      {props.errors.length ? (
        <section className="panel error-panel">
          <h2>Ошибки в таблице</h2>
          {props.errors.map((error) => <p key={`${error.workId}-${error.type}-${error.message}`}>{error.message}</p>)}
        </section>
      ) : (
        <>
          <main className="simulator-layout">
            <div className="gantt-stack">
              <GanttLegend />
              <GanttChart
                items={props.scheduledItems}
                projectDuration={props.metrics.projectDuration}
                selectedId={props.selectedId}
                onSelect={props.onSelect}
                onShiftChange={(id, shift) => props.onChange(id, 'plannedShift', shift)}
              />
            </div>
            <aside className="right-rail">
              {props.selectedWork ? (
                <WorkEditor
                  work={props.selectedWork}
                  onWorkersChange={(workers) => props.onChange(props.selectedWork!.id, 'workers', workers)}
                  onDurationChange={(duration) => props.onChange(props.selectedWork!.id, 'duration', duration)}
                  onShiftChange={(shift) => props.onChange(props.selectedWork!.id, 'plannedShift', shift)}
                />
              ) : null}
            </aside>
          </main>
          <MetricsCards metrics={props.metrics} />
          <MetricsExplanation />
          <div className="resource-comparison">
            <ResourceChart
              title="Занятость сотрудников без учета резерва"
              description="Первый график показывает исходную нагрузку по ранним срокам: работа выполняется своей базовой длительностью и текущим числом исполнителей."
              usage={props.usage}
              resourceLimit={initialScenario.resourceLimit}
            />
            <ResourceChart
              title="Занятость сотрудников с учетом резерва"
              description="Второй график показывает оптимизированную нагрузку: некритические работы растягиваются в пределах резерва и могут требовать меньше исполнителей."
              usage={props.usageWithFloat}
              resourceLimit={initialScenario.resourceLimit}
            />
          </div>
          <div className="bottom-grid">
            {props.selectedWork ? <DependencyChart selectedWork={props.selectedWork} workItems={props.scheduledItems} /> : null}
            <section className="panel info-card">
              <span>Автоматическая обратная связь</span>
              <h2>Что изменилось после правки</h2>
              <p>{props.notice}</p>
              <p>{compareMetrics(props.baseMetrics, props.metrics)}</p>
              <h3>Рекомендации системы</h3>
              <ul>{recommendations(props.metrics, props.baseMetrics, props.selectedWork).map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}

function GanttLegend() {
  return (
    <section className="panel gantt-legend" aria-label="Легенда диаграммы Ганта">
      <span><i className="legend-dot legend-dot--critical" />красный — критическая работа</span>
      <span><i className="legend-dot legend-dot--normal" />синий — работа с резервом</span>
      <span><i className="legend-dot legend-dot--float" />штриховка — доступный резерв</span>
      <span><i className="legend-dot legend-dot--selected" />серый фон — выбранная работа</span>
    </section>
  );
}

function MetricsExplanation() {
  return (
    <section className="panel metrics-explanation">
      <h2>Как читать показатели</h2>
      <div>
        <p><b>Общая длительность</b> — срок проекта по сетевому графику. Его задаёт самая длинная цепочка зависимых работ.</p>
        <p><b>Максимальная занятость</b> — самый высокий пик сотрудников в один день после распределения некритических работ по резервам. Если он выше лимита, возникает перегрузка.</p>
        <p><b>Средняя занятость</b> показывает, насколько равномерно используются сотрудники на протяжении проекта с учетом резервов времени.</p>
        <p><b>Критические работы</b> не имеют резерва: задержка такой работы задерживает весь проект.</p>
        <p><b>Работы с резервом</b> можно растянуть или сдвинуть без изменения общего срока, если изменение не превышает резерв.</p>
        <p><b>Дни перегрузки</b> — дни, когда даже после использования резервов назначено больше сотрудников, чем доступно по лимиту.</p>
        <p><b>Дни простоя</b> — дни, когда ресурсы используются слабо, и график можно попробовать уплотнить.</p>
        <p><b>Эффективность</b> считается так: средняя занятость сотрудников / лимит сотрудников × 100%. Если значение около 100%, ресурс используется плотно. Если выше 100%, в среднем требуется больше людей, чем доступно по лимиту. Если сильно ниже 100%, есть простой.</p>
      </div>
    </section>
  );
}

function HowToTab() {
  return (
    <section className="panel reading-panel">
      <h2>Как работать</h2>
      <p>На странице есть определитель работ, диаграмма Ганта, график занятости сотрудников, расчётные параметры и итоговый результат.</p>
      <h3>Что нужно сделать студенту</h3>
      <p>Заполните или измените таблицу работ, проверьте события начала и окончания, назначьте исполнителей, найдите критические работы и попробуйте улучшить общий срок проекта.</p>
      <h3>Как работать с таблицей</h3>
      <p>Номер работы — это код работы. Событие начала показывает, откуда начинается работа, событие окончания — чем она завершается. Если окончание одной работы совпадает с началом другой, между ними появляется зависимость.</p>
      <p>Трудоёмкость — общий объём работы, измеряется в человеко-днях. Например, 20 человеко-дней означает, что один исполнитель выполнял бы эту работу 20 дней, а 4 исполнителя — примерно 5 дней. Количество исполнителей — сколько людей назначено. Продолжительность рассчитывается по формуле: продолжительность = округление вверх(трудоёмкость / количество исполнителей).</p>
      <h3>Как читать диаграмму Ганта</h3>
      <p>Каждая горизонтальная полоса — работа. Начало полосы показывает раннее начало, длина — продолжительность. Критические работы выделены цветом; если такая работа задержится, задержится весь проект.</p>
      <h3>Как читать график занятости</h3>
      <p>Каждый столбец показывает, сколько сотрудников занято в конкретный день или час. Для работ с резервом система распределяет трудоёмкость на длительность плюс резерв, поэтому некритическая работа может выполняться меньшим числом людей без увеличения общего срока. Столбец выше лимита означает перегрузку, слишком низкий столбец — простой ресурсов.</p>
      <h3>Как понять, стало лучше или хуже</h3>
      <p>Если общий срок проекта уменьшился, решение стало лучше по срокам. Если перегрузка уменьшилась, решение стало лучше по ресурсам. Некритическая работа может измениться без влияния на общий срок.</p>
      <h3>Простой пример</h3>
      <p>Работа имеет трудоёмкость 20 человеко-дней. Если назначить 4 исполнителя, продолжительность будет равна округлению вверх от 20 / 4, то есть 5 дней. Если назначить 5 исполнителей, продолжительность станет 4 дня. Общий срок уменьшится только тогда, когда работа находится на критическом пути.</p>
      <h3>Порядок действий</h3>
      <ol>
        <li>Откройте вкладку “Симулятор”.</li>
        <li>Найдите таблицу “Определитель работ сетевого графика”.</li>
        <li>Проверьте или измените работы.</li>
        <li>Выберите работу.</li>
        <li>Измените количество исполнителей.</li>
        <li>Посмотрите, как изменилась продолжительность.</li>
        <li>Проверьте диаграмму Ганта.</li>
        <li>Проверьте график занятости.</li>
        <li>Откройте вкладку “Результат”.</li>
        <li>Сохраните решение.</li>
      </ol>
    </section>
  );
}

function DescriptionTab() {
  return (
    <section className="panel reading-panel">
      <h2>Описание</h2>
      <p><b>Сетевой график</b> — модель проекта, где работы связаны событиями и зависимостями.</p>
      <p><b>Работа</b> — действие, которое требует времени и ресурсов. <b>Событие</b> — момент начала или завершения работ. <b>Трудоёмкость</b> показывает общий объём работы и измеряется в человеко-днях.</p>
      <p><b>Начальное событие</b> запускает работу, <b>конечное событие</b> фиксирует её завершение. Последовательность работ образует путь.</p>
      <p><b>Критический путь</b> — путь с максимальной длительностью. Работы на нем имеют нулевой резерв.</p>
      <p><b>Резерв времени</b> показывает, насколько работу можно сдвинуть или растянуть без изменения общего срока проекта. В графике занятости этот резерв используется для более равномерного распределения сотрудников.</p>
      <p><b>Ранние сроки</b> показывают самый ранний возможный старт и финиш, а <b>поздние сроки</b> — крайние допустимые сроки без срыва проекта.</p>
      <p><b>Диаграмма Ганта</b> показывает работы во времени. <b>График занятости</b> показывает нагрузку сотрудников по дням или часам с учетом возможного использования резервов некритических работ.</p>
      <h3>Определитель работ сетевого графика</h3>
      <p>Это исходная таблица проекта. Из неё система берет номера работ, события, трудоёмкость в человеко-днях и количество исполнителей. По событиям строятся зависимости: если одна работа завершается событием X, а другая начинается с X, вторая зависит от первой.</p>
      <p>Любое изменение определителя влияет на расчёты, диаграммы, критический путь, занятость и итоговый результат.</p>
    </section>
  );
}

function CalculationsContent({ items, errors, selectedId, onSelect, metrics }: { items: ReturnType<typeof calculateSchedule>['items']; errors: Array<{ message: string }>; selectedId: string; onSelect: (id: string) => void; metrics: ProjectMetrics }) {
  if (errors.length) {
    return <section className="panel error-panel">{errors.map((error) => <p key={error.message}>{error.message}</p>)}</section>;
  }
  return (
    <>
      <section className="calculation-cards">
        <MetricExplain title="Общая длительность" value={`${metrics.projectDuration} дн.`} text="Длина самого длинного пути от начального события до конечного." />
        <MetricExplain title="Критический путь" value={`${metrics.criticalCount} работ`} text="Работы без резерва. Их задержка двигает весь проект." />
        <MetricExplain title="Макс. занятость" value={`${metrics.maxWorkers} чел.`} text="Самый высокий пик потребности в сотрудниках." />
        <MetricExplain title="Эффективность" value={`${metrics.efficiency}%`} text="Средняя занятость относительно лимита ресурсов." />
      </section>
      <CalculationsTable items={items} selectedId={selectedId} onSelect={onSelect} />
      <details className="panel formula-details">
        <summary>Показать формулы</summary>
        <p>Продолжительность = округление вверх(трудоёмкость / количество исполнителей)</p>
        <p>Резерв = поздний старт - ранний старт</p>
        <p>Эффективность = средняя занятость / лимит сотрудников × 100%</p>
      </details>
    </>
  );
}

function ResultTab({ current, base, errorsCount, recommendations: items }: { current: ProjectMetrics; base: ProjectMetrics; errorsCount: number; recommendations: string[] }) {
  const rows = [
    ['Общий срок проекта', `${base.projectDuration} дн.`, `${current.projectDuration} дн.`],
    ['Максимальная занятость', `${base.maxWorkers} чел.`, `${current.maxWorkers} чел.`],
    ['Средняя занятость', `${base.averageWorkers.toFixed(1)} чел.`, `${current.averageWorkers.toFixed(1)} чел.`],
    ['Критические работы', base.criticalCount, current.criticalCount],
    ['Работы с резервом', base.floatCount, current.floatCount],
    ['Дни перегрузки', base.overloadDays, current.overloadDays],
    ['Ошибки в таблице', 0, errorsCount],
  ];
  return (
    <div className="result-layout">
      <section className="panel result-summary">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Анализ результата</h2>
            <p>{compareMetrics(base, current)}</p>
          </div>
        </div>
        <QualityScale score={solutionScore(current, base, errorsCount)} />
        <div className="feedback-grid">
          <article><span>Что получилось</span><b>Проект длится {current.projectDuration} дн.</b></article>
          <article><span>Что стало лучше</span><b>{current.projectDuration < base.projectDuration ? 'Срок сокращен' : 'Срок пока не сокращен'}</b></article>
          <article><span>Что стало хуже</span><b>{current.overloadDays > base.overloadDays ? 'Выросла перегрузка' : 'Критичных ухудшений нет'}</b></article>
          <article><span>Где риск</span><b>{current.overloadDays} дней перегрузки</b></article>
        </div>
      </section>
      <section className="panel">
        <div className="panel__header panel__header--stacked">
          <div>
            <h2>Исходный вариант vs текущий</h2>
            <p>Сравните, как ваши изменения повлияли на срок и ресурсы.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Показатель</th><th>Исходный вариант</th><th>Текущий вариант</th></tr></thead>
            <tbody>{rows.map(([name, left, right]) => <tr key={String(name)}><td>{name}</td><td>{left}</td><td>{right}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel recommendations">
        <h3>Автоматическая обратная связь</h3>
        <p>Ваш проект длится {current.projectDuration} дней. Найдено {current.overloadDays} дней перегрузки. Критических работ: {current.criticalCount}.</p>
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}

function MetricExplain({ title, value, text }: { title: string; value: string; text: string }) {
  return <article className="metric-explain"><span>{title}</span><strong>{value}</strong><p>{text}</p></article>;
}

function QualityScale({ score }: { score: number }) {
  const label = score >= 85 ? 'отлично' : score >= 70 ? 'хорошо' : score >= 50 ? 'нормально' : 'плохо';
  return (
    <div className="quality-scale">
      <div className="quality-scale__labels"><span>плохо</span><span>нормально</span><span>хорошо</span><span>отлично</span></div>
      <div className="quality-scale__bar"><i style={{ width: `${score}%` }} /></div>
      <strong>Итоговая оценка решения: {score}% · {label}</strong>
    </div>
  );
}

function solutionScore(current: ProjectMetrics, base: ProjectMetrics, errorsCount: number) {
  const durationPenalty = Math.max(0, current.projectDuration - base.projectDuration) * 3;
  const overloadPenalty = current.overloadDays * 4;
  const errorPenalty = errorsCount * 10;
  return Math.max(0, Math.min(100, 100 - durationPenalty - overloadPenalty - errorPenalty));
}

function HistoryTab({ history }: { history: ChangeRecord[] }) {
  return (
    <section className="panel">
      <div className="panel__header"><h2>История изменений</h2><span>{history.length}</span></div>
      {history.length === 0 ? <p className="empty-state">Изменений пока нет.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Время</th><th>Работа</th><th>Поле</th><th>Было</th><th>Стало</th><th>Срок проекта</th><th>Макс. занятость</th></tr></thead>
            <tbody>{history.map((item) => <tr key={item.id}><td>{item.timestamp}</td><td>{item.workCode}</td><td>{fieldLabelFromHistory(item.field)}</td><td>{displayHistoryValue(item.oldValue)}</td><td>{displayHistoryValue(item.newValue)}</td><td>{item.projectDurationBefore} → {item.projectDurationAfter}</td><td>{item.maxWorkersBefore} → {item.maxWorkersAfter}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StudentCommentsTab({ comment, savedMessage }: { comment?: string; savedMessage: string }) {
  return (
    <div className="comments-layout">
      <section className="panel reading-panel">
        <h2>Комментарии преподавателя</h2>
        {comment ? (
          <p>{comment}</p>
        ) : (
          <p>Комментарий появится здесь после проверки. Пока можно сохранить черновик или отправить решение преподавателю.</p>
        )}
      </section>
      <section className="panel reading-panel">
        <h2>Мои ошибки</h2>
        <ul>
          <li>проверьте, нет ли неверных зависимостей между событиями;</li>
          <li>сравните пики занятости с лимитом сотрудников;</li>
          <li>убедитесь, что изменения действительно улучшают срок или ресурсы;</li>
          <li>посмотрите, какие работы остались критическими.</li>
        </ul>
        <p>{savedMessage || 'Черновик еще не сохранен в текущей сессии.'}</p>
      </section>
    </div>
  );
}

function metricsForDefinitions(definitions: WorkDefinition[]): ProjectMetrics {
  const built = buildWorkItemsFromDefinitions(definitions);
  if (built.errors.length) return emptyMetrics();
  const schedule = calculateSchedule(built.items);
  return schedule.errors.length ? emptyMetrics() : getProjectMetrics(schedule.items, initialScenario.resourceLimit);
}

function getNextEventValue(from: string, definitions: WorkDefinition[]): string {
  const existingEvents = new Set(definitions.flatMap((definition) => [definition.from.trim(), definition.to.trim()]));
  for (let index = 1; index < 100; index += 1) {
    const candidate = `${from}.${index}`;
    if (!existingEvents.has(candidate)) {
      return candidate;
    }
  }

  return `${from}.${Date.now()}`;
}

function emptyMetrics(): ProjectMetrics {
  return { projectDuration: 0, maxWorkers: 0, averageWorkers: 0, criticalCount: 0, floatCount: 0, overloadDays: 0, idleDays: 0, efficiency: 0 };
}

function normalizeStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    submitted: 'Отправлено',
    checked: 'Проверено',
    'Не начато': 'Не начато',
    'В работе': 'Черновик',
    'Завершено': 'Сохранено',
    'Требует проверки': 'Требует проверки',
  };
  return labels[status] ?? status;
}

function compareMetrics(base: ProjectMetrics, current: ProjectMetrics): string {
  if (current.projectDuration < base.projectDuration && current.overloadDays <= base.overloadDays) return 'Стало лучше: срок проекта сократился без роста перегрузки.';
  if (current.projectDuration > base.projectDuration || current.overloadDays > base.overloadDays) return 'Стало хуже: вырос срок проекта или появилась дополнительная перегрузка.';
  return 'Без существенных изменений: общий срок проекта не изменился.';
}

function recommendations(current: ProjectMetrics, base: ProjectMetrics, selectedWork?: ReturnType<typeof calculateSchedule>['items'][number]): string[] {
  const result = ['Попробуйте добавить исполнителей на критические работы.', 'Некритические работы можно сдвигать в пределах резерва.', 'Сокращение некритической работы не всегда уменьшает общий срок.'];
  if (current.overloadDays > 0) result.push('Проверьте периоды перегрузки сотрудников.');
  if (current.idleDays > 0) result.push('Есть период простоя ресурсов. Возможно, часть работ можно сдвинуть.');
  if (selectedWork && !selectedWork.isCritical) result.push('Выбрана работа с резервом: её изменение может не повлиять на общий срок.');
  if (current.projectDuration >= base.projectDuration) result.push('Для сокращения срока ищите работы на критическом пути.');
  return result;
}

function buildChangeNotice(before: WorkDefinition[], after: WorkDefinition[]): string {
  const beforeMetrics = metricsForDefinitions(before);
  const afterMetrics = metricsForDefinitions(after);
  if (afterMetrics.projectDuration < beforeMetrics.projectDuration) return `Общий срок проекта уменьшился: ${beforeMetrics.projectDuration} → ${afterMetrics.projectDuration}.`;
  if (afterMetrics.projectDuration > beforeMetrics.projectDuration) return `Общий срок проекта вырос: ${beforeMetrics.projectDuration} → ${afterMetrics.projectDuration}.`;
  return 'Общий срок проекта не изменился. Возможно, изменилась некритическая работа или изменение укладывается в резерв.';
}

function fieldLabel(field: keyof WorkDefinition): string {
  const labels: Record<string, string> = {
    code: 'номер работы',
    from: 'событие начала',
    to: 'событие окончания',
    title: 'наименование работы',
    labor: 'трудоёмкость',
    workers: 'количество исполнителей',
    duration: 'продолжительность',
    calculationMode: 'режим расчёта',
    plannedShift: 'сдвиг',
  };
  return labels[field] ?? field;
}

function fieldLabelFromHistory(field: string): string {
  const labels: Record<string, string> = {
    calculationMode: 'режим расчёта',
    'fixed-labor': 'фиксированная трудоёмкость',
    'manual-duration': 'ручная продолжительность',
  };
  return labels[field] ?? field;
}

function displayHistoryValue(value: string | number): string | number {
  const labels: Record<string, string> = {
    calculationMode: 'режим расчёта',
    'fixed-labor': 'фиксированная трудоёмкость',
    'manual-duration': 'ручная продолжительность',
  };
  return typeof value === 'string' ? labels[value] ?? value : value;
}

function mapBackendWorks(works: any[]): WorkDefinition[] {
  return works.map((work) => ({
    id: String(work.id),
    code: work.work_number,
    from: work.event_start,
    to: work.event_end,
    title: work.title,
    labor: Number(work.labor),
    workers: Number(work.workers),
    duration: Number(work.duration),
    calculationMode: work.calculation_mode === 'manual_duration' ? 'manual-duration' : 'fixed-labor',
    plannedShift: Number(work.planned_shift ?? 0),
  }));
}

function mapBackendHistory(history: any[]): ChangeRecord[] {
  return history.map((item) => ({
    id: String(item.id),
    timestamp: item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : '',
    workCode: item.work_item ? String(item.work_item) : '',
    field: fieldLabelFromHistory(item.field_name ?? ''),
    oldValue: displayHistoryValue(item.old_value ?? ''),
    newValue: displayHistoryValue(item.new_value ?? ''),
    projectDurationBefore: Number(item.project_duration_before ?? 0),
    projectDurationAfter: Number(item.project_duration_after ?? 0),
    maxWorkersBefore: Number(item.max_workers_before ?? 0),
    maxWorkersAfter: Number(item.max_workers_after ?? 0),
  }));
}

async function syncDefinitionsToBackend(
  solutionId: string | number,
  savedDefinitions: WorkDefinition[],
  currentDefinitions: WorkDefinition[],
) {
  const currentIds = new Set(currentDefinitions.map((definition) => definition.id));
  for (const saved of savedDefinitions) {
    if (!currentIds.has(saved.id) && isBackendId(saved.id)) {
      await studentApi.deleteWork(solutionId, saved.id);
    }
  }
  for (const definition of currentDefinitions) {
    const payload = toBackendWorkPayload(definition);
    if (isBackendId(definition.id)) {
      await studentApi.updateWork(solutionId, definition.id, payload);
    } else {
      await studentApi.addWork(solutionId, payload);
    }
  }
}

function toBackendWorkPayload(definition: WorkDefinition) {
  return {
    work_number: definition.code,
    event_start: definition.from,
    event_end: definition.to,
    title: definition.title,
    labor: definition.labor,
    workers: definition.workers,
    duration: definition.duration,
    calculation_mode: definition.calculationMode === 'manual-duration' ? 'manual_duration' : 'fixed_labor',
    planned_shift: definition.plannedShift ?? 0,
    order_index: 0,
  };
}

function isBackendId(id: string) {
  return /^\d+$/.test(id);
}

