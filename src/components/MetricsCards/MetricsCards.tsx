import type { ProjectMetrics } from '../../domain/network/types';

/** Дробные числа пишутся по-русски: «4,8 чел.», а не «4.8 чел.». */
const decimalFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

type MetricsCardsProps = {
  metrics: ProjectMetrics;
};

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    ['Общая длительность', `${metrics.projectDuration} дн.`],
    ['Макс. занятость', `${metrics.maxWorkers} чел.`],
    ['Средняя занятость', `${decimalFormat.format(metrics.averageWorkers)} чел.`],
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
