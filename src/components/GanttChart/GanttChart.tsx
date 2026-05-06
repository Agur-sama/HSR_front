import type { ScheduledWorkItem } from '../../domain/network/types';

type GanttChartProps = {
  items: ScheduledWorkItem[];
  projectDuration: number;
  selectedId: string;
  onSelect: (id: string) => void;
  onShiftChange?: (id: string, shift: number) => void;
};

export function GanttChart({ items, projectDuration, selectedId, onSelect, onShiftChange }: GanttChartProps) {
  const gridTemplateColumns = `170px repeat(${Math.max(projectDuration, 1)}, minmax(28px, 1fr))`;

  return (
    <section className="panel gantt">
      <div className="panel__header">
        <h2>Диаграмма Ганта</h2>
        <span>{projectDuration} дней</span>
      </div>
      <div className="gantt__days" style={{ gridTemplateColumns }}>
        <span />
        {Array.from({ length: projectDuration }, (_, index) => (
          <b key={index}>{index + 1}</b>
        ))}
      </div>
      <div className="gantt__body">
        <div className="gantt__deadline" style={{ gridTemplateColumns }}>
          <span style={{ gridColumn: `${projectDuration + 1} / span 1` }}>срок проекта</span>
        </div>
        {items.map((item) => {
          const maxShift = Math.max(0, (item.plannedShift ?? 0) + item.totalFloat);
          const currentShift = Math.min(item.plannedShift ?? 0, maxShift);
          const tooltip = [
            `${item.code}: ${item.title}`,
            `Длительность: ${item.duration} дн.`,
            `Исполнители: ${item.workers}`,
            `Резерв: ${item.totalFloat} дн.`,
            item.isCritical ? 'Критическая работа' : 'Работа с резервом',
          ].join('\n');

          return (
            <button
              type="button"
              key={item.id}
              className={`gantt__row ${item.id === selectedId ? 'is-selected' : ''}`}
              style={{ gridTemplateColumns }}
              onClick={() => onSelect(item.id)}
              title={tooltip}
            >
              <span className="gantt__label">
                <strong>{item.code}</strong>
                {item.title}
                <small>старт {item.earlyStart + 1}, финиш {item.earlyFinish}</small>
              </span>
              <span
                className={`gantt__bar ${item.isCritical ? 'gantt__bar--critical' : ''}`}
                style={{
                  gridColumn: `${item.earlyStart + 2} / span ${item.duration}`,
                }}
              >
                {item.duration} дн.
              </span>
              {item.totalFloat > 0 ? (
                <span
                  className="gantt__float"
                  style={{
                    gridColumn: `${item.earlyFinish + 2} / span ${item.totalFloat}`,
                  }}
                />
              ) : null}
              {item.id === selectedId && onShiftChange && maxShift > 0 ? (
                <span className="gantt__shift" onClick={(event) => event.stopPropagation()}>
                  <span>Сдвиг: {currentShift} из {maxShift} дн.</span>
                  <input
                    type="range"
                    min={0}
                    max={maxShift}
                    value={currentShift}
                    onChange={(event) => onShiftChange(item.id, Number(event.target.value))}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
