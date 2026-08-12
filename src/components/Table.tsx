import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import Modal from './Modal';
import { IcoChevronUp, IcoChevronDown } from './icons';
import Checkbox from './Checkbox';

export interface Column<T extends Record<string, any> = any> {
  key: string;
  header: React.ReactNode;
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
  sortState?: { key: string; direction: 'asc' | 'desc' }[];
  onSortChange?: (newSortState: { key: string; direction: 'asc' | 'desc' }[]) => void;
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
  sortState: externalSortState,
  onSortChange,
  initialSort = [],
  fixedHeader = false,
  height = '400px',
  columnMaxWidth = 300,
  stickyRight = [],
}: TableProps<T>) {
  // ---------- Сортировка ----------
  const [internalSortState, setInternalSortState] = useState<{ key: string; direction: 'asc' | 'desc' }[]>(initialSort);
  const sortState = externalSortState !== undefined ? externalSortState : internalSortState;
  const updateSortState = (newState: { key: string; direction: 'asc' | 'desc' }[]) => {
    if (onSortChange) {
      onSortChange(newState);
    } else {
      setInternalSortState(newState);
    }
  };

  // ---------- Управление видимостью и порядком ----------
  const [order, setOrder] = useState<string[]>(columns.map(c => c.key));
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(columns.map(c => c.key)));

  // ---------- Модалка настроек ----------
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOrder, setSettingsOrder] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState<Set<string>>(new Set());

  const openSettings = () => {
    setSettingsOrder([...order]);
    setSettingsVisible(new Set(visibleKeys));
    setSettingsOpen(true);
  };

  const applySettings = () => {
    setOrder(settingsOrder);
    setVisibleKeys(settingsVisible);
    setSettingsOpen(false);
  };

  const toggleVisible = (key: string) => {
    const newSet = new Set(settingsVisible);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSettingsVisible(newSet);
  };

  // ---------- Перемещение с защитой от закреплённых колонок ----------
  const moveUp = (key: string) => {
    const idx = settingsOrder.indexOf(key);
    if (idx <= 0) return;
    if (stickyRight.includes(key)) return;
    if (stickyRight.includes(settingsOrder[idx - 1])) return;
    const newOrder = [...settingsOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setSettingsOrder(newOrder);
  };

  const moveDown = (key: string) => {
    const idx = settingsOrder.indexOf(key);
    if (idx === -1 || idx === settingsOrder.length - 1) return;
    if (stickyRight.includes(key)) return;
    if (stickyRight.includes(settingsOrder[idx + 1])) return;
    const newOrder = [...settingsOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setSettingsOrder(newOrder);
  };

  // ---------- Обработка клика по заголовку (сортировка разрешена для всех) ----------
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
    updateSortState(newState);
  };

  // ---------- Сортировка данных ----------
  const sortedData = useMemo(() => {
    const sorted = [...data];
    if (sortState.length === 0) return sorted;

    sorted.sort((a, b) => {
      for (const { key, direction } of sortState) {
        let aVal = (a as any)[key];
        let bVal = (b as any)[key];

        const aIsNull = aVal === null || aVal === undefined;
        const bIsNull = bVal === null || bVal === undefined;

        if (aIsNull && bIsNull) continue;
        if (aIsNull) return 1;
        if (bIsNull) return -1;
        if (aVal === bVal) continue;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
          if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
          continue;
        }

        const cmp = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [data, sortState]);

  // ---------- Sticky ----------
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
    borderRight: `1px solid ${t.borderSubtle}`,
    color: t.text,
    textAlign: 'left',
    background: t.bgSurface,
  };

  const getStickyStyle = (colIndex: number, isHeader: boolean = false): React.CSSProperties => {
    const key = columns[colIndex]?.key;
    if (!key || !isStickyRight(key)) return {};
    return {
      position: 'sticky',
      right: 0,
      zIndex: isHeader ? 5 : 3,
      background: t.bgSurface,
      boxShadow: isFirstSticky(colIndex) ? `inset 2px 0 ${t.border}` : 'none',
    };
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellBaseStyle,
    fontWeight: 600,
    cursor: 'default',
    transition: 'background 0.15s',
    position: 'sticky',
    top: 0,
    zIndex: 3,
    background: t.bgSurface,
  };

  const tableContainerStyle: React.CSSProperties = {
    width: '100%',
    overflow: fixedHeader ? 'auto' : 'visible',
    height: fixedHeader ? height : 'auto',
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    background: t.bgSurface,
  };

  // ---------- Позиционирование кнопки-шестерёнки ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const updateButtonPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top - 12,
        left: rect.left - 12,
      });
    }
  };

  useEffect(() => {
    updateButtonPosition();
    const handleScroll = () => updateButtonPosition();
    const handleResize = () => updateButtonPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => updateButtonPosition());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    updateButtonPosition();
  }, [sortedData, columns, visibleKeys, order]);

  // ---------- Отображаемые колонки ----------
  const displayColumns = useMemo(() => {
    return order
      .filter(key => visibleKeys.has(key))
      .map(key => columns.find(c => c.key === key)!)
      .filter(Boolean);
  }, [order, visibleKeys, columns]);

  // ---------- Стили для кнопки-шестерёнки ----------
  const gearButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: buttonPosition.top,
    left: buttonPosition.left,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    color: t.iconColor,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'background 0.2s',
    padding: 0,
    opacity: 1,
    pointerEvents: 'auto',
    fontSize: 18,
  };

  const settingsButton = !settingsOpen
    ? createPortal(
        <button
          className="settings-button"
          style={gearButtonStyle}
          onClick={openSettings}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = t.bgSurface)}
          aria-label="Настройка таблицы"
        >
          ⚙
        </button>,
        document.body
      )
    : null;

  // ---------- Вспомогательная функция для стилей кнопок перемещения ----------
  const getMoveButtonStyle = (canMove: boolean): React.CSSProperties => ({
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: 4,
    cursor: canMove ? 'pointer' : 'default',
    color: canMove ? t.iconColor : t.placeholder,
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1,
    transition: 'background 0.15s, opacity 0.15s',
    opacity: canMove ? 1 : 0.3,
    pointerEvents: canMove ? 'auto' : 'none',
  });

  // ---------- Рендер ----------
  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={containerRef} style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'auto' }}>
            <thead
              style={{
                position: fixedHeader ? 'sticky' : 'static',
                top: 0,
                zIndex: 5,
                background: t.bgSurface,
                boxShadow: `0 2px 0 ${t.border}`,
              }}
            >
              <tr>
                {displayColumns.map((col) => {
                  const sortKey = col.key;
                  const sortIndex = sortState.findIndex(s => s.key === sortKey);
                  const isSorted = sortIndex !== -1;
                  const direction = isSorted ? sortState[sortIndex].direction : undefined;
                  const originalIndex = columns.findIndex(c => c.key === col.key);
                  const stickyStyle = originalIndex !== -1 ? getStickyStyle(originalIndex, true) : {};

                  const isSortable = col.sortable;

                  return (
                    <th
                      key={col.key}
                      style={{
                        ...headerCellStyle,
                        ...stickyStyle,
                        ...col.headerStyle,
                        cursor: isSortable ? 'pointer' : 'default',
                      }}
                      onClick={(e) => isSortable && handleHeaderClick(sortKey, e)}
                      onMouseEnter={(e) => {
                        if (isSortable) e.currentTarget.style.background = t.navHoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (isSortable) e.currentTarget.style.background = t.bgSurface;
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{col.header}</span>
                        {isSortable && isSorted && (
                          <span style={{ fontSize: 12, color: t.accent }}>
                            {direction === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                        {isSortable && !isSorted && (
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
                  <td
                    colSpan={displayColumns.length}
                    style={{
                      padding: 30,
                      textAlign: 'center',
                      color: t.placeholder,
                      background: t.bgSurface,
                    }}
                  >
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
                    {displayColumns.map((col) => {
                      const originalIndex = columns.findIndex(c => c.key === col.key);
                      const stickyStyle = originalIndex !== -1 ? getStickyStyle(originalIndex, false) : {};
                      const cellContent = col.render
                        ? col.render((row as any)[col.key], row)
                        : (row as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          style={{
                            ...cellBaseStyle,
                            ...stickyStyle,
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
      </div>

      {settingsButton}

      <Modal
        theme={t}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOk={applySettings}
        title="Настройка таблицы"
        columns={1}
        rows={settingsOrder.length || 1}
        okText="Применить"
        cancelText="Отмена"
        canSubmit={true}
        fields={settingsOrder.map((key, index) => {
          const col = columns.find(c => c.key === key);
          const isSticky = stickyRight.includes(key);
          const canMoveUp = !isSticky && index > 0 && !stickyRight.includes(settingsOrder[index - 1]);
          const canMoveDown = !isSticky && index < settingsOrder.length - 1 && !stickyRight.includes(settingsOrder[index + 1]);

          // Массив для двух кнопок – устраняет дублирование разметки
          const moveButtons = [
            { key: 'up', Icon: IcoChevronUp, canMove: canMoveUp, handler: moveUp },
            { key: 'down', Icon: IcoChevronDown, canMove: canMoveDown, handler: moveDown },
          ];

          return {
            row: index,
            col: 0,
            content: col ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Checkbox
                  theme={t}
                  checked={settingsVisible.has(key)}
                  onChange={() => toggleVisible(key)}
                  label={String(col.header)}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  {moveButtons.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => btn.canMove && btn.handler(key)}
                      style={getMoveButtonStyle(btn.canMove)}
                      onMouseEnter={(e) => {
                        if (btn.canMove) e.currentTarget.style.background = t.navHoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (btn.canMove) e.currentTarget.style.background = t.bgSurface;
                      }}
                    >
                      <btn.Icon s={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          };
        })}
      />
    </>
  );
};