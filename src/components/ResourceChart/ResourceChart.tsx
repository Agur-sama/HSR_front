import type { ResourceUsagePoint } from '../../domain/network/types';

type ResourceChartProps = {
  title?: string;
  description?: string;
  usage: ResourceUsagePoint[];
  resourceLimit: number;
};

export function ResourceChart({ title = 'Занятость сотрудников', description, usage, resourceLimit }: ResourceChartProps) {
  const maxValue = Math.max(resourceLimit, ...usage.map((point) => point.workers), 1);

  return (
    <section className="panel resource-chart">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="panel-hint">{description}</p> : null}
        </div>
        <span>Лимит: {resourceLimit}</span>
      </div>
      <div className="resource-chart__plot">
        {usage.map((point) => (
          <div className="resource-chart__column" key={point.day}>
            <span
              className={`resource-chart__bar ${point.overloaded ? 'is-overloaded' : ''} ${point.idle ? 'is-idle' : ''}`}
              style={{ height: `${Math.max(6, (point.workers / maxValue) * 100)}%` }}
              title={`${point.day} день: ${point.workers} сотрудников`}
            />
            <small>{point.day}</small>
          </div>
        ))}
        <div className="resource-chart__limit" style={{ bottom: `${(resourceLimit / maxValue) * 100}%` }}>
          Лимит
        </div>
      </div>
    </section>
  );
}
