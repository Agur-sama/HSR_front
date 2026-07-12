export interface DataEntryColumn {
  id: string;
  label: string;
}

export interface DataEntryRow {
  id: string;
  label: string;
  helper?: string;
}

interface DataEntryTableProps {
  caption: string;
  columns: DataEntryColumn[];
  rows: DataEntryRow[];
  values: Record<string, Record<string, string>>;
  onChange: (rowId: string, columnId: string, value: string) => void;
}

export function DataEntryTable({ caption, columns, rows, values, onChange }: DataEntryTableProps) {
  return (
    <div className="data-entry">
      <h3>{caption}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Показатель</th>
              {columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {row.label}
                  {row.helper ? <small>{row.helper}</small> : null}
                </th>
                {columns.map((column) => (
                  <td key={column.id}>
                    <input
                      aria-label={`${row.label}: ${column.label}`}
                      onChange={(event) => onChange(row.id, column.id, event.target.value)}
                      value={values[row.id]?.[column.id] ?? ''}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
