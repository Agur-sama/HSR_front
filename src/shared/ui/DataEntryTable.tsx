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
  getError?: (rowId: string, columnId: string) => string | null;
}

export function DataEntryTable({ caption, columns, rows, values, onChange, getError }: DataEntryTableProps) {
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
                    {(() => {
                      const error = getError?.(row.id, column.id) ?? null;

                      return (
                        <>
                          <input
                            aria-invalid={error ? true : undefined}
                            aria-label={`${row.label}: ${column.label}`}
                            className={error ? 'is-invalid' : undefined}
                            onChange={(event) => onChange(row.id, column.id, event.target.value)}
                            value={values[row.id]?.[column.id] ?? ''}
                          />
                          {error ? <small className="field-error">{error}</small> : null}
                        </>
                      );
                    })()}
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
