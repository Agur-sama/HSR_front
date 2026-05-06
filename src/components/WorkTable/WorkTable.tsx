import type { ScheduledWorkItem } from '../../domain/network/types';

type WorkTableProps = {
  items: ScheduledWorkItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function WorkTable({ items, selectedId, onSelect }: WorkTableProps) {
  return (
    <section className="panel work-table">
      <div className="panel__header">
        <h2>Работы проекта</h2>
        <span>{items.length} этапов</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Работа</th>
              <th>Длит.</th>
              <th>Сотр.</th>
              <th>Резерв</th>
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
                <td>
                  <strong>{item.title}</strong>
                  <small>{item.isCritical ? 'Критическая работа' : 'Есть резерв'}</small>
                </td>
                <td>{item.duration}</td>
                <td>{item.workers}</td>
                <td>{item.totalFloat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
