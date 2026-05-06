import { useEffect, useState } from 'react';
import type { NetworkValidationError, ScheduledWorkItem, WorkDefinition } from '../../domain/network/types';

type WorkDefinitionTableProps = {
  definitions: WorkDefinition[];
  scheduledItems: ScheduledWorkItem[];
  errors: NetworkValidationError[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, field: keyof WorkDefinition, value: string | number) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onRestore: () => void;
  onSave: () => void;
  onReset: () => void;
  readOnly?: boolean;
};

const numericFields = new Set<keyof WorkDefinition>(['labor', 'workers', 'duration', 'plannedShift']);

export function WorkDefinitionTable({
  definitions,
  scheduledItems,
  errors,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onDelete,
  onClear,
  onRestore,
  onSave,
  onReset,
  readOnly = false,
}: WorkDefinitionTableProps) {
  const [compact, setCompact] = useState(false);
  const [explainedId, setExplainedId] = useState('');
  const scheduleById = new Map(scheduledItems.map((item) => [item.id, item]));
  const explained = definitions.find((item) => item.id === explainedId);
  const explainedSchedule = explained ? scheduleById.get(explained.id) : undefined;

  function fieldError(workId: string, field: keyof WorkDefinition) {
    return errors.find((error) => error.workId === workId && error.field === field)?.message;
  }

  return (
    <section className={`panel definition-table ${compact ? 'definition-table--compact' : ''}`}>
      <div className="panel__header panel__header--stacked">
        <div>
          <h2>Определитель работ сетевого графика</h2>
          <p>
            Это главный источник данных тренажёра. Из таблицы строятся зависимости, диаграмма Ганта, критический путь,
            занятость сотрудников и итоговая оценка.
          </p>
        </div>
        <div className="table-actions">
          {!readOnly ? (
            <>
              <button className="button button--primary" type="button" onClick={onAdd}>Добавить работу</button>
              <button className="button button--ghost" type="button" onClick={onSave}>Сохранить</button>
              <button className="button button--ghost" type="button" onClick={onReset}>Сбросить изменения</button>
              <button className="button button--ghost" type="button" onClick={onRestore}>Восстановить пример</button>
              <button className="button button--ghost danger" type="button" onClick={onClear}>Очистить таблицу</button>
            </>
          ) : null}
          <label className="compact-toggle">
            <input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} />
            Компактный режим
          </label>
        </div>
      </div>
      <div className="table-wrap">
        <table className="definition-table__table">
          <thead>
            <tr>
              <th title="Код или номер работы">№</th>
              <th title="Событие, из которого начинается работа">Начало</th>
              <th title="Событие, которым работа завершается">Окончание</th>
              <th>Название работы</th>
              <th title="Общий объём работы в человеко-днях">Трудоёмкость</th>
              <th title="Сколько исполнителей назначено на работу">Исполнители</th>
              <th title="В фиксированном режиме считается как трудоёмкость / исполнители">Длительность</th>
              <th>Резерв</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {definitions.map((definition) => {
              const scheduled = scheduleById.get(definition.id);
              const expectedDuration = Math.max(1, Math.ceil(definition.labor / Math.max(1, definition.workers)));
              const durationWarning = definition.calculationMode === 'manual-duration' && definition.duration !== expectedDuration;
              const eventWarning = Number.isFinite(Number(definition.from)) && Number.isFinite(Number(definition.to)) && Number(definition.to) < Number(definition.from);

              return (
                <tr
                  key={definition.id}
                  className={`${definition.id === selectedId ? 'is-selected' : ''} ${scheduled?.isCritical ? 'is-critical' : ''} ${durationWarning || eventWarning ? 'has-warning' : ''}`}
                  onClick={() => onSelect(definition.id)}
                >
                  <EditableCell definition={definition} field="code" error={fieldError(definition.id, 'code')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="from" error={fieldError(definition.id, 'from')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="to" error={fieldError(definition.id, 'to')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="title" error={fieldError(definition.id, 'title')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="labor" error={fieldError(definition.id, 'labor')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="workers" error={fieldError(definition.id, 'workers')} onChange={onChange} readOnly={readOnly} />
                  <EditableCell definition={definition} field="duration" error={fieldError(definition.id, 'duration')} onChange={onChange} readOnly={readOnly} />
                  <td>{scheduled?.totalFloat ?? 0} дн.</td>
                  <td>
                    {scheduled?.isCritical ? <span className="badge badge--critical">Критическая</span> : <span className="badge">Есть резерв</span>}
                    {durationWarning ? <small className="warning-text">Длительность отличается от расчётной: {expectedDuration} дн.</small> : null}
                    {eventWarning ? <small className="warning-text">Окончание меньше начала. Проверьте события.</small> : null}
                  </td>
                  <td className="row-actions">
                    <button className="button button--ghost" type="button" onClick={(event) => {
                      event.stopPropagation();
                      setExplainedId(explainedId === definition.id ? '' : definition.id);
                    }}>
                      Пояснить
                    </button>
                    {!readOnly ? <button className="button button--ghost danger" type="button" onClick={(event) => {
                      event.stopPropagation();
                      onDelete(definition.id);
                    }}>
                      Удалить
                    </button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {explained && explainedSchedule ? (
        <div className="row-explanation">
          <h3>Пояснение по работе {explained.code}</h3>
          <p>
            Длительность считается как округление вверх({explained.labor} / {explained.workers}) = {Math.max(1, Math.ceil(explained.labor / Math.max(1, explained.workers)))} дн.
            Работа {explainedSchedule.isCritical ? 'критическая, потому что её полный резерв равен 0' : `имеет резерв ${explainedSchedule.totalFloat} дн., поэтому её можно сдвигать в допустимых пределах`}.
          </p>
        </div>
      ) : null}
      <p className="formula-note">
        Трудоёмкость измеряется в человеко-днях. В фиксированном режиме длительность пересчитывается автоматически.
        В ручном режиме длительность можно задать отдельно, но система покажет предупреждение, если она не совпадает с нормативной.
      </p>
    </section>
  );
}

type EditableCellProps = {
  definition: WorkDefinition;
  field: keyof WorkDefinition;
  error?: string;
  onChange: (id: string, field: keyof WorkDefinition, value: string | number) => void;
  readOnly?: boolean;
};

function EditableCell({ definition, field, error, onChange, readOnly = false }: EditableCellProps) {
  const value = definition[field];
  const isNumber = numericFields.has(field);
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  function commit() {
    const nextValue = isNumber ? Number(draft) : draft;
    if (isNumber && draft.trim() === '') return;
    if (nextValue !== value) onChange(definition.id, field, nextValue);
  }

  return (
    <td className={error ? 'cell-error' : ''}>
      <input
        type={isNumber ? 'number' : 'text'}
        min={isNumber ? 1 : undefined}
        value={draft}
        readOnly={readOnly}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {field === 'duration' ? (
        <select
          className="mode-select"
          value={definition.calculationMode}
          disabled={readOnly}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange(definition.id, 'calculationMode', event.target.value)}
        >
          <option value="fixed-labor">Фиксированная трудоёмкость</option>
          <option value="manual-duration">Ручная продолжительность</option>
        </select>
      ) : null}
      {error ? <small>{error}</small> : null}
    </td>
  );
}
