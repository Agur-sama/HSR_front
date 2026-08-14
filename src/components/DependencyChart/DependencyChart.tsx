import type { ScheduledWorkItem, WorkItem } from '../../domain/network/types';
import { calculateSchedule, updateWorkWorkers } from '../../domain/network/calculations';

type DependencyChartProps = {
  selectedWork: ScheduledWorkItem;
  workItems: WorkItem[];
};

export function DependencyChart({ selectedWork, workItems }: DependencyChartProps) {
  const maxWorkers = Math.max(8, selectedWork.workers + 3);
  const variants = Array.from({ length: maxWorkers }, (_, index) => {
    const workers = index + 1;
    const updated = updateWorkWorkers(workItems, selectedWork.id, workers);
    const schedule = calculateSchedule(updated);
    const work = schedule.items.find((item) => item.id === selectedWork.id);
    return {
      workers,
      duration: work?.duration ?? 0,
      projectDuration: schedule.projectDuration,
    };
  });
  const maxDuration = Math.max(...variants.map((variant) => variant.duration), 1);

  return (
    <section className="panel dependency-chart">
      <div className="panel__header">
        <h2>Анализ выбранной работы</h2>
        <span>{selectedWork.code}</span>
      </div>
      <p className="hint">
        {selectedWork.isCritical
          ? 'Критическая работа: изменение длительности напрямую влияет на общий срок.'
          : 'Есть резерв: изменение может не повлиять на срок, пока укладывается в резерв.'}
      </p>
      <div className="dependency-chart__list">
        {variants.map((variant) => (
          <div className="dependency-chart__row" key={variant.workers}>
            <span>{variant.workers} чел.</span>
            <b style={{ width: `${(variant.duration / maxDuration) * 100}%` }}>{variant.duration} дн.</b>
            <small>проект: {variant.projectDuration} дн.</small>
          </div>
        ))}
      </div>
    </section>
  );
}
