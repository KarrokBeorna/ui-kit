import React, { useState } from 'react';
import type { Theme } from '../themes/theme';

export interface Column<T extends Record<string, any> = any> {
  key: string;
  header: string;
  width?: number;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, any>> {
  theme: Theme;
  columns: Column<T>[];
  data: T[];
  rowKey?: string;
  onSort?: (sorted: { key: string; direction: 'asc' | 'desc' }[]) => void;
  initialSort?: { key: string; direction: 'asc' | 'desc' }[];
}

export default function Table<T extends Record<string, any>>({
  theme: t,
  columns,
  data,
  rowKey = 'id',
  onSort,
  initialSort = [],
}: TableProps<T>) {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' }[]>(initialSort);

  const handleHeaderClick = (key: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    let newState: { key: string; direction: 'asc' | 'desc' }[] = [];

    if (ctrl) {
      newState = [...sortState];
      const existing = newState.findIndex(s => s.key === key);
      if (existing !== -1) {
        const current = newState[existing];
        if (current.direction === 'asc') {
          newState[existing] = { key, direction: 'desc' };
        } else {
          newState.splice(existing, 1);
        }
      } else {
        newState.push({ key, direction: 'asc' });
      }
    } else {
      const existing = sortState.findIndex(s => s.key === key);
      if (existing !== -1) {
        const current = sortState[existing];
        if (current.direction === 'asc') {
          newState = [{ key, direction: 'desc' }];
        } else {
          newState = [];
        }
      } else {
        newState = [{ key, direction: 'asc' }];
      }
    }
    setSortState(newState);
    if (onSort) onSort(newState);
  };

  const sortedData = [...data];
  if (sortState.length > 0) {
    sortedData.sort((a, b) => {
      for (const { key, direction } of sortState) {
        const aVal = (a as any)[key];
        const bVal = (b as any)[key];
        if (aVal === bVal) continue;
        const cmp = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 600, tableLayout: 'fixed' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr>
            {columns.map((col) => {
              const sortIndex = sortState.findIndex(s => s.key === col.key);
              const isSorted = sortIndex !== -1;
              const direction = isSorted ? sortState[sortIndex].direction : undefined;
              return (
                <th
                  key={col.key}
                  style={{
                    background: t.bgSurface,
                    borderBottom: `2px solid ${t.border}`,
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: t.text,
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : 'default',
                    width: col.width ? `${col.width}px` : 'auto',
                    minWidth: col.width ? `${col.width}px` : '120px',
                    transition: 'background 0.15s',
                    ...col.headerStyle,
                  }}
                  onClick={(e) => col.sortable && handleHeaderClick(col.key, e)}
                  onMouseEnter={(e) => { if (col.sortable) e.currentTarget.style.background = t.navHoverBg; }}
                  onMouseLeave={(e) => { if (col.sortable) e.currentTarget.style.background = t.bgSurface; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && isSorted && (
                      <span style={{ fontSize: 12, color: t.accent }}>
                        {direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                    {col.sortable && !isSorted && (
                      <span style={{ fontSize: 10, color: t.placeholder }}>⇅</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 30, textAlign: 'center', color: t.placeholder }}>
                Нет данных
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={`${row[rowKey]}-${index}`}
                style={{
                  borderBottom: `1px solid ${t.borderSubtle}`,
                  animation: 'fadeInRow 0.25s ease forwards',
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '10px 14px',
                      color: t.text,
                      borderBottom: `1px solid ${t.borderSubtle}`,
                      ...col.style,
                    }}
                  >
                    {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}