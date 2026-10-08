import React, { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found matching this criteria.',
  title,
  subtitle,
  headerAction,
  className = '',
}: TableProps<T>) {
  return (
    <div className={`tm-bg-white tm-bg-white-shadow ${className}`.trim()} style={{ padding: '30px' }}>
      {/* Optional Table Header Bar */}
      {(title || headerAction) && (
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <div>
            {title && (
              <h3
                className="text-uppercase tm-font-semibold mb-1"
                style={{ fontSize: '1.35rem', color: '#1f3646' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="tm-margin-b-0" style={{ fontSize: '0.85rem', color: '#888' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {/* Responsive Table */}
      <div className="table-responsive">
        <table
          className="table"
          style={{
            marginBottom: 0,
            fontSize: '0.85rem',
            color: '#555',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#F4F4F4',
                borderBottom: '2px solid #ee5057',
                color: '#1f3646',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '14px 12px',
                    fontWeight: 700,
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5">
                  <i className="fa fa-info-circle fa-2x tm-color-primary mb-2 d-block"></i>
                  <p className="mb-0 text-muted">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  style={{
                    borderBottom: '1px solid #eee',
                    verticalAlign: 'middle',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '14px 12px',
                        verticalAlign: 'middle',
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render ? col.render(row, index) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
