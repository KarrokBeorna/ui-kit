import React, { useState } from 'react';
import type { Theme } from '../themes/theme';

export interface Column<T extends Record<string, any> = any> {
  key: string;
  header: string;
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
  fixedHeader?: boolean;
  height?: string | number;
  columnMaxWidth?: number;
  stickyRight?: string[];
}

export default function Table<T extends Record<string, any>>({
  theme: t,
  columns,
  data,
  rowKey = 'id',
  onSort,
  initialSort = [],
  fixedHeader = false,
  height = '400px',
  columnMaxWidth = 300,
  stickyRight = [],
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

  // Определяем индексы закреплённых колонок и первую из них
  const stickyIndices = columns
    .map((col, index) => (stickyRight.includes(col.key) ? index : -1))
    .filter(idx => idx !== -1);
  const firstStickyIndex = stickyIndices.length > 0 ? stickyIndices[0] : -1;

  const isStickyRight = (key: string) => stickyRight.includes(key);
  const isFirstSticky = (index: number) => index === firstStickyIndex;

  const cellBaseStyle: React.CSSProperties = {
    padding: '10px 14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: columnMaxWidth,
    borderBottom: `1px solid ${t.borderSubtle}`,
    borderRight: `1px solid ${t.borderSubtle}`,
    color: t.text,
    textAlign: 'left',
    background: t.bgSurface,
  };

  const getStickyStyle = (colIndex: number, isHeader: boolean = false): React.CSSProperties => {
    const key = columns[colIndex].key;
    if (!isStickyRight(key)) return {};
    return {
      position: 'sticky',
      right: 0,
      zIndex: isHeader ? 5 : 3,
      background: t.bgSurface,
      borderLeft: isFirstSticky(colIndex) ? `2px solid ${t.border}` : 'none',
      boxShadow: isFirstSticky(colIndex) ? '-2px 0 8px rgba(0,0,0,0.08)' : 'none',
    };
  };

  // Стиль для обычного заголовка (не закреплённого)
  const headerCellStyle: React.CSSProperties = {
    ...cellBaseStyle,
    borderBottom: `2px solid ${t.border}`,
    fontWeight: 600,
    cursor: 'default',
    transition: 'background 0.15s',
    position: 'sticky',
    top: 0,
    zIndex: 4,
    background: t.bgSurface,
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    overflow: fixedHeader ? 'auto' : 'visible',
    height: fixedHeader ? height : 'auto',
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    background: t.bgSurface,
  };

  return (
    <div style={containerStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'auto' }}>
        <thead
          style={{
            position: fixedHeader ? 'sticky' : 'static',
            top: 0,
            background: t.bgSurface,
            boxShadow: `0 2px 0 ${t.border}`,
          }}>
          <tr>
            {columns.map((col, index) => {
              const sortIndex = sortState.findIndex(s => s.key === col.key);
              const isSorted = sortIndex !== -1;
              const direction = isSorted ? sortState[sortIndex].direction : undefined;

              return (
                <th
                  key={col.key}
                  style={{
                    ...headerCellStyle,
                    ...getStickyStyle(index, true),
                    cursor: col.sortable ? 'pointer' : 'default',
                    ...col.headerStyle,
                  }}
                  onClick={(e) => col.sortable && handleHeaderClick(col.key, e)}
                  onMouseEnter={(e) => {
                    if (col.sortable) e.currentTarget.style.background = t.navHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (col.sortable) e.currentTarget.style.background = t.bgSurface;
                  }}
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
              <td colSpan={columns.length} style={{ padding: 30, textAlign: 'center', color: t.placeholder, background: t.bgSurface }}>
                Нет данных
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={row[rowKey]}
                style={{
                  animation: 'fadeInRow 0.25s ease forwards',
                  animationDelay: `${rowIndex * 30}ms`,
                  background: t.bgSurface,
                }}
              >
                {columns.map((col, index) => {
                  const cellContent = col.render
                    ? col.render((row as any)[col.key], row)
                    : (row as any)[col.key];

                  return (
                    <td
                      key={col.key}
                      style={{
                        ...cellBaseStyle,
                        ...getStickyStyle(index, false),
                        ...col.style,
                      }}
                    >
                      {cellContent}
                    </td>
                  );
                })}
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