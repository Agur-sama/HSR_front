import { useEffect, useMemo, useState } from 'react';
import type { ScheduledWorkItem } from '../../domain/network/types';

type WorkEditorProps = {
  work: ScheduledWorkItem;
  onWorkersChange: (workers: number) => void;
  onDurationChange: (duration: number) => void;
  onShiftChange: (shift: number) => void;
  error?: string;
};

export function WorkEditor({ work, onWorkersChange, onDurationChange, onShiftChange, error }: WorkEditorProps) {
  const [workers, setWorkers] = useState(work.workers);
  const [duration, setDuration] = useState(work.duration);
  const [shift, setShift] = useState(work.plannedShift ?? 0);
  const maxShift = Math.max(0, (work.plannedShift ?? 0) + work.totalFloat);
  const shownShift = Math.min(shift, maxShift);
  const predictedDuration = useMemo(() => Math.max(1, Math.ceil(work.labor / Math.max(workers, 1))), [work.labor, workers]);

  useEffect(() => {
    setWorkers(work.workers);
    setDuration(work.duration);
    setShift(work.plannedShift ?? 0);
  }, [work.id, work.workers, work.duration, work.plannedShift]);

  function applyChanges() {
    onWorkersChange(workers);
    onDurationChange(duration);
    onShiftChange(shownShift);
  }

  function resetDraft() {
    setWorkers(work.workers);
    setDuration(work.duration);
    setShift(work.plannedShift ?? 0);
  }

  return (
    <section className="panel work-editor">
      <div className="panel__header">
        <h2>Редактирование</h2>
        <span>{work.code}</span>
      </div>
      <h3>{work.title}</h3>
      <p className={`status-note ${work.isCritical ? 'status-note--critical' : ''}`}>
        {work.isCritical
          ? 'Критическая работа: сдвиг или рост длительности меняет срок проекта.'
          : `Есть резерв ${Math.max(0, maxShift)} дн.: работу можно сдвигать без увеличения общего срока.`}
      </p>
      <label>
        <span>Количество сотрудников</span>
        <input
          type="number"
          min={1}
          value={workers}
          onChange={(event) => setWorkers(Number(event.target.value))}
          onBlur={() => onWorkersChange(workers)}
        />
      </label>
      <div className="editor-preview">
        По трудоемкости {work.labor} чел.-дн. длительность станет {predictedDuration} дн.
      </div>
      <label>
        <span>Длительность, дни</span>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          onBlur={() => onDurationChange(duration)}
        />
      </label>
      <label>
        <span>Сдвиг в пределах резерва</span>
        <input
          type="range"
          min={0}
          max={maxShift}
          value={shownShift}
          disabled={maxShift === 0}
          onChange={(event) => {
            const value = Number(event.target.value);
            setShift(value);
            onShiftChange(value);
          }}
        />
      </label>
      <div className="editor-preview">
        Сдвиг: {shownShift} дн. из {maxShift} дн. Если эту работу сдвинуть, все зависимые работы автоматически начнутся
        позже, потому что их старт считается от окончания предыдущего этапа.
      </div>
      <div className="editor-impact">
        <h4>Как это влияет на проект</h4>
        <p>
          Исполнители меняют длительность через трудоёмкость. Сдвиг использует резерв и переносит зависимые этапы,
          но не должен увеличивать общий срок, пока он в пределах доступного резерва.
        </p>
      </div>
      <div className="editor-actions">
        <button className="button button--primary" type="button" onClick={applyChanges}>Применить</button>
        <button className="button button--ghost" type="button" onClick={resetDraft}>Отменить</button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
