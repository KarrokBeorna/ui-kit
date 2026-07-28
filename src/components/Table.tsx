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

  // Сортировка данных
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

  // Формируем шаблон колонок для Grid: каждая колонка — minmax(auto, 300px)
  const gridTemplateColumns = columns.map(() => 'minmax(auto, 300px)').join(' ');

  // Общий стиль для всех ячеек (заголовки и данные)
  const cellBaseStyle: React.CSSProperties = {
    padding: '10px 14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: `1px solid ${t.borderSubtle}`,
    color: t.text,
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        background: t.bgSurface,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns,
          fontSize: 14,
          minWidth: 600,
        }}
      >
        {/* Заголовки (строка 1) */}
        {columns.map((col, colIndex) => {
          const sortIndex = sortState.findIndex(s => s.key === col.key);
          const isSorted = sortIndex !== -1;
          const direction = isSorted ? sortState[sortIndex].direction : undefined;

          return (
            <div
              key={col.key}
              style={{
                ...cellBaseStyle,
                gridRow: 1,
                gridColumn: colIndex + 1,
                background: t.bgSurface,
                borderBottom: `2px solid ${t.border}`,
                fontWeight: 600,
                cursor: col.sortable ? 'pointer' : 'default',
                transition: 'background 0.15s',
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
            </div>
          );
        })}

        {/* Данные (строки 2 и далее) */}
        {sortedData.length === 0 ? (
          <div
            style={{
              gridRow: 2,
              gridColumn: `1 / ${columns.length + 1}`,
              padding: 30,
              textAlign: 'center',
              color: t.placeholder,
            }}
          >
            Нет данных
          </div>
        ) : (
          sortedData.map((row, rowIndex) =>
            columns.map((col, colIndex) => {
              const cellContent = col.render
                ? col.render((row as any)[col.key], row)
                : (row as any)[col.key];

              return (
                <div
                  key={`${row[rowKey]}-${col.key}`}
                  style={{
                    ...cellBaseStyle,
                    gridRow: rowIndex + 2,
                    gridColumn: colIndex + 1,
                    animation: 'fadeInRow 0.25s ease forwards',
                    animationDelay: `${rowIndex * 30}ms`,
                    ...col.style,
                  }}
                >
                  {cellContent}
                </div>
              );
            })
          )
        )}
      </div>

      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}