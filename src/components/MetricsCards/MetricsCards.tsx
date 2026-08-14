import type { ProjectMetrics } from '../../domain/network/types';

type MetricsCardsProps = {
  metrics: ProjectMetrics;
};

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    ['Общая длительность', `${metrics.projectDuration} дн.`],
    ['Макс. занятость', `${metrics.maxWorkers} чел.`],
    ['Средняя занятость', `${metrics.averageWorkers.toFixed(1)} чел.`],
    ['Критические работы', `${metrics.criticalCount}`],
    ['Работы с резервом', `${metrics.floatCount}`],
    ['Дни перегрузки', `${metrics.overloadDays}`],
    ['Дни простоя', `${metrics.idleDays}`],
    ['Эффективность', `${metrics.efficiency}%`],
  ];

  return (
    <section className="metrics-grid" aria-label="Ключевые показатели проекта">
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
