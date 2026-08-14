import type { ScheduledWorkItem } from '../../domain/network/types';

type CalculationsTableProps = {
  items: ScheduledWorkItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function CalculationsTable({ items, selectedId, onSelect }: CalculationsTableProps) {
  return (
    <section className="panel">
      <div className="panel__header panel__header--stacked">
        <div>
          <h2>Расчётные параметры сетевого графика</h2>
          <p>Ранние и поздние сроки пересчитываются автоматически после каждого изменения определителя работ.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Номер работы</th>
              <th>Событие начало</th>
              <th>Событие окончание</th>
              <th>Наименование работы</th>
              <th>Продолжительность</th>
              <th>Раннее начало</th>
              <th>Раннее окончание</th>
              <th>Позднее начало</th>
              <th>Позднее окончание</th>
              <th>Полный резерв</th>
              <th>Критическая работа</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={`${item.id === selectedId ? 'is-selected' : ''} ${item.isCritical ? 'is-critical' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <td>{item.code}</td>
                <td>{item.from}</td>
                <td>{item.to}</td>
                <td>{item.title}</td>
                <td>{item.duration}</td>
                <td>{item.earlyStart}</td>
                <td>{item.earlyFinish}</td>
                <td>{item.lateStart}</td>
                <td>{item.lateFinish}</td>
                <td>{item.totalFloat}</td>
                <td>{item.isCritical ? 'Да' : 'Нет'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="explain-grid">
        <p><b>Раннее начало</b> — самый ранний момент, когда работа может стартовать после зависимостей.</p>
        <p><b>Раннее окончание</b> — раннее начало плюс продолжительность.</p>
        <p><b>Позднее начало</b> — крайний старт без срыва срока проекта.</p>
        <p><b>Позднее окончание</b> — крайнее окончание без срыва срока проекта.</p>
        <p><b>Полный резерв</b> — сколько времени можно потерять без изменения общего срока.</p>
        <p><b>Критическая работа</b> — работа с нулевым резервом.</p>
      </div>
    </section>
  );
}
