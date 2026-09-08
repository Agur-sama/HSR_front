import { useModuleState } from '../../bridge/context';
import { GroupedNumberInput } from '../../shared/ui/GroupedNumberInput';
import { getPz2StageColor, getPz2StageWorks, parsePz2Number, pluralWorks } from './model';
import { getPz2LoadColumns, getPz2Plan, getPz2WorkLaborHours } from './plan';
import type { Pz2Draft } from './types';

/**
 * Шаг 04 ПЗ2: ресурсный график (ТЗ ПЗ2 §8).
 *
 * Людей на проект фиксированное число, студент раскладывает их по этапам.
 * Этапы строятся параллельно, поэтому от раскладки зависит и срок, и ровность
 * загрузки: гистограмма внизу — то, ради чего экран и сделан.
 */
export function PlanStep() {
  const { draft, updateDraft } = useModuleState<Pz2Draft>();
  const totalWorkers = parsePz2Number(draft.totalWorkers) ?? 0;
  const allocations = draft.stages.map((stage) => ({
    stageId: stage.id,
    workers: parsePz2Number(draft.workersByStage[stage.id] ?? '') ?? 0,
  }));
  const plan = getPz2Plan(draft, allocations, totalWorkers);
  const left = totalWorkers - plan.assignedWorkers;
  const load = getPz2LoadColumns(plan.usage);
  const peakHeight = Math.max(totalWorkers, ...load.map((column) => column.workers), 1);

  return (
    <div className="plan-step">
      <section className="form-section">
        <p className="eyebrow">Люди</p>
        <h3>Сколько рабочих и как они разложены по этапам</h3>

        <div className="plan-total">
          <label htmlFor="pz2-total-workers">Всего рабочих на проект</label>
          <GroupedNumberInput
            ariaLabel="Всего рабочих на проект"
            id="pz2-total-workers"
            onChange={(value) => updateDraft((current) => ({ ...current, totalWorkers: value }))}
            value={draft.totalWorkers}
          />
          <p className={left === 0 ? 'status-note' : 'field-warning'}>
            {describeLeft(left, totalWorkers, plan.assignedWorkers)}
          </p>
        </div>

        {draft.stages.length === 0 ? (
          <p className="status-note">Этапов нет — вернитесь на шаг «Разбиение на этапы».</p>
        ) : (
          <ul className="plan-stages">
            {draft.stages.map((stage) => {
              const works = getPz2StageWorks(draft, stage.id);
              const laborHours = works.reduce((sum, work) => sum + getPz2WorkLaborHours(work), 0);

              return (
                <li key={stage.id}>
                  <span aria-hidden="true" className="stage-card__color" style={{ background: getPz2StageColor(stage.order) }} />
                  <span className="plan-stages__title">
                    <strong>{stage.title}</strong>
                    <span className="work-card__meta">
                      {works.length} {pluralWorks(works.length)} · {formatHours(laborHours)} чел.-ч
                    </span>
                  </span>
                  <GroupedNumberInput
                    ariaLabel={`Рабочих на этап «${stage.title}»`}
                    onChange={(value) =>
                      updateDraft((current) => ({
                        ...current,
                        workersByStage: { ...current.workersByStage, [stage.id]: value },
                      }))
                    }
                    value={draft.workersByStage[stage.id] ?? ''}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {plan.stagesWithoutWorkers.length > 0 ? (
          <p className="field-warning">
            Этапов без людей: {plan.stagesWithoutWorkers.length}. Пока на этап никого не назначили, его работы в график
            не попадают.
          </p>
        ) : null}
      </section>

      <section className="form-section">
        <p className="eyebrow">График</p>
        <h3>Этапы во времени</h3>

        {plan.items.length === 0 ? (
          <p className="status-note">
            График появится, когда у этапов будут работы и назначенные люди: срок работы считается из её трудоёмкости и
            числа рабочих.
          </p>
        ) : (
          <div className="gantt">
            {draft.stages.map((stage) => {
              const stageItems = plan.items.filter((item) =>
                getPz2StageWorks(draft, stage.id).some((work) => work.id === item.id),
              );

              if (stageItems.length === 0) {
                return null;
              }

              return (
                <div className="gantt__row" key={stage.id}>
                  <span className="gantt__label" title={stage.title}>
                    {stage.title}
                  </span>
                  <span className="gantt__track">
                    {stageItems.map((item) => (
                      <span
                        className="gantt__bar"
                        key={item.id}
                        style={{
                          background: getPz2StageColor(stage.order),
                          left: `${(item.earlyStart / plan.metrics.projectDuration) * 100}%`,
                          width: `${(item.duration / plan.metrics.projectDuration) * 100}%`,
                        }}
                        title={`${item.title}: дни ${item.earlyStart + 1}–${item.earlyFinish}, ${item.workers} чел.`}
                      >
                        {item.title}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
            <div className="gantt__axis">
              <span>день 1</span>
              <span>день {plan.metrics.projectDuration}</span>
            </div>
          </div>
        )}

        {plan.usage.length > 0 ? (
          <>
            {/* Гистограмма — главный элемент экрана: студент выравнивает именно её. */}
            <div className="load-histogram">
              {load.map((column) => (
                <span
                  className={`load-histogram__bar${column.overloaded ? ' is-over' : ''}`}
                  key={column.fromDay}
                  style={{ height: `${(column.workers / peakHeight) * 100}%` }}
                  title={`Дни ${column.fromDay}–${column.toDay}: ${column.workers} чел.`}
                />
              ))}
            </div>
            <p className="osm-map-hint">
              Потребность в людях по дням. Красным — дни, когда нужно больше людей, чем есть на проекте.
            </p>
          </>
        ) : null}

        <dl className="forecast-summary-grid forecast-summary-grid--compact">
          <div>
            <dt>Срок</dt>
            <dd>{plan.metrics.projectDuration} дн.</dd>
          </div>
          <div>
            <dt>Пик потребности</dt>
            <dd className={plan.metrics.overloadDays > 0 ? 'is-off' : undefined}>{plan.metrics.maxWorkers} чел.</dd>
          </div>
          <div>
            <dt>В среднем занято</dt>
            <dd>{Math.round(plan.metrics.averageWorkers)} чел.</dd>
          </div>
          <div>
            <dt>Дней с нехваткой</dt>
            <dd className={plan.metrics.overloadDays > 0 ? 'is-off' : 'is-matched'}>{plan.metrics.overloadDays}</dd>
          </div>
        </dl>

        <p className="status-note">
          Нормативы трудоёмкости пока черновые: заказчик разрешил сгенерировать их, чтобы не ждать (ТЗ §9), и передал на
          проверку эксперту. Сроки поменяются вместе с ними.
        </p>
      </section>
    </div>
  );
}

function describeLeft(left: number, total: number, assigned: number) {
  if (total <= 0) {
    return 'Укажите, сколько рабочих есть на проект: от этого считаются сроки.';
  }

  if (left === 0) {
    return `Все ${total} рабочих распределены.`;
  }

  return left > 0
    ? `Не распределено рабочих: ${left}. Пока они простаивают.`
    : `Распределено больше, чем есть: ${assigned} из ${total}. Столько людей на проекте нет.`;
}

function formatHours(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
