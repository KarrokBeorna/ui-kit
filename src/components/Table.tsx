import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  rowClassName?: (row: T) => string;
  rowStyle?: (row: T) => React.CSSProperties;
  columnOrder?: string[];
  visibleColumns?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  onVisibleColumnsChange?: (visible: string[]) => void;
  onApplySettings?: (visible: string[], order: string[]) => void;
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
  onRowClick,
  selectedRowKey,
  rowClassName,
  rowStyle,
  columnOrder: externalColumnOrder,
  visibleColumns: externalVisibleColumns,
  onColumnOrderChange,
  onVisibleColumnsChange,
  onApplySettings,
}: TableProps<T>) {
  // ---------- Сортировка ----------
  const [internalSortState, setInternalSortState] = useState<{ key: string; direction: 'asc' | 'desc' }[]>(initialSort);

  const sortState = externalSortState !== undefined ? externalSortState : internalSortState;

  const updateSortState = (newState: { key: string; direction: 'asc' | 'desc' }[]) => {
    if (onSortChange) onSortChange(newState);
    else setInternalSortState(newState);
  };

  // ---------- Видимость и порядок ----------
  const [internalOrder, setInternalOrder] = useState<string[]>(() => columns.map(c => c.key),);
  const [internalVisible, setInternalVisible] = useState<Set<string>>(() => new Set(columns.map(c => c.key)),);

  const order = externalColumnOrder !== undefined ? externalColumnOrder : internalOrder;

  const visibleKeys = useMemo(
    () =>
      externalVisibleColumns !== undefined
        ? new Set(externalVisibleColumns)
        : internalVisible,
    [externalVisibleColumns, internalVisible],
  );

  // ---------- Быстрые индексы (O(1) вместо O(n) в рендере) ----------
  const columnByKey = useMemo(() => {
    const map = new Map<string, Column<T>>();
    for (const col of columns) map.set(col.key, col);
    return map;
  }, [columns]);

  const columnIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach((col, idx) => map.set(col.key, idx));
    return map;
  }, [columns]);

  const stickyRightSet = useMemo(() => new Set(stickyRight), [stickyRight]);

  const updateOrder = useCallback(
    (newOrder: string[]) => {
      if (onColumnOrderChange) onColumnOrderChange(newOrder);
      else setInternalOrder(newOrder);
    },
    [onColumnOrderChange],
  );

  const updateVisible = useCallback(
    (newVisible: Set<string>) => {
      if (onVisibleColumnsChange) onVisibleColumnsChange(Array.from(newVisible));
      else setInternalVisible(newVisible);
    },
    [onVisibleColumnsChange],
  );

  // ---------- Модалка настроек ----------
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOrder, setSettingsOrder] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState<Set<string>>(new Set());

  const openSettings = useCallback(() => {
    setSettingsOrder([...order]);
    setSettingsVisible(new Set(visibleKeys));
    setSettingsOpen(true);
  }, [order, visibleKeys]);

  const applySettings = useCallback(() => {
    if (onApplySettings) {
      onApplySettings(Array.from(settingsVisible), settingsOrder);
    } else {
      updateOrder(settingsOrder);
      updateVisible(settingsVisible);
    }
    setSettingsOpen(false);
  }, [onApplySettings, settingsVisible, settingsOrder, updateOrder, updateVisible]);

  const toggleVisible = useCallback((key: string) => {
    setSettingsVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ---------- Перемещение с защитой от закреплённых колонок ----------
  const moveUp = useCallback(
    (key: string) => {
      setSettingsOrder(prev => {
        const idx = prev.indexOf(key);
        if (idx <= 0) return prev;
        if (stickyRightSet.has(key)) return prev;
        if (stickyRightSet.has(prev[idx - 1])) return prev;
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
    },
    [stickyRightSet],
  );

  const moveDown = useCallback(
    (key: string) => {
      setSettingsOrder(prev => {
        const idx = prev.indexOf(key);
        if (idx === -1 || idx === prev.length - 1) return prev;
        if (stickyRightSet.has(key)) return prev;
        if (stickyRightSet.has(prev[idx + 1])) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
    },
    [stickyRightSet],
  );

  // ---------- Клик по заголовку ----------
  const handleHeaderClick = (key: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    let newState: { key: string; direction: 'asc' | 'desc' }[] = [];

    if (ctrl) {
      newState = [...sortState];
      const existing = newState.findIndex(s => s.key === key);
      if (existing !== -1) {
        const current = newState[existing];
        if (current.direction === 'asc') newState[existing] = { key, direction: 'desc' };
        else newState.splice(existing, 1);
      } else {
        newState.push({ key, direction: 'asc' });
      }
    } else {
      const existing = sortState.findIndex(s => s.key === key);
      if (existing !== -1) {
        if (sortState[existing].direction === 'asc') newState = [{ key, direction: 'desc' }];
        else newState = [];
      } else {
        newState = [{ key, direction: 'asc' }];
      }
    }
    updateSortState(newState);
  };

  // ---------- Sticky ----------
  const firstStickyIndex = useMemo(() => {
    for (let i = 0; i < columns.length; i++) {
      if (stickyRightSet.has(columns[i].key)) return i;
    }
    return -1;
  }, [columns, stickyRightSet]);

  const getStickyStyle = useCallback(
    (colIndex: number, isHeader: boolean = false): React.CSSProperties => {
      const key = columns[colIndex]?.key;
      if (!key || !stickyRightSet.has(key)) return {};
      return {
        position: 'sticky',
        right: 0,
        zIndex: isHeader ? 5 : 3,
        background: t.bgSurface,
        boxShadow: colIndex === firstStickyIndex ? `inset 2px 0 ${t.border}` : 'none',
      };
    },
    [columns, stickyRightSet, firstStickyIndex, t.bgSurface, t.border],
  );

  // ---------- Базовые стили ----------
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

  // ---------- Позиционирование шестерёнки ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const updateButtonPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setButtonPosition({ top: rect.top - 12, left: rect.left - 12 });
    }
  }, []);

  useEffect(() => {
    updateButtonPosition();
    const handleScroll = () => updateButtonPosition();
    const handleResize = () => updateButtonPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(() => updateButtonPosition());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, [updateButtonPosition]);

  useEffect(() => {
    updateButtonPosition();
  }, [data, columns, visibleKeys, order, updateButtonPosition]);

  // ---------- Отображаемые колонки ----------
  const displayColumns = useMemo(() => {
    const uniqueKeys = Array.from(new Set(order.filter(key => visibleKeys.has(key))));
    return uniqueKeys
      .map(key => columnByKey.get(key))
      .filter((col): col is Column<T> => col !== undefined);
  }, [order, visibleKeys, columnByKey]);

  // ---------- Стили кнопки-шестерёнки ----------
  const settingsButton = useMemo(() => {
    if (settingsOpen) return null;
    const style: React.CSSProperties = {
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
    return createPortal(
      <button
        className="settings-button"
        style={style}
        onClick={openSettings}
        onMouseEnter={e => (e.currentTarget.style.background = t.navHoverBg)}
        onMouseLeave={e => (e.currentTarget.style.background = t.bgSurface)}
        aria-label="Настройка таблицы"
      >
        ⚙
      </button>,
      document.body,
    );
  }, [settingsOpen, buttonPosition, t, openSettings]);

  // ---------- Стиль кнопок перемещения ----------
  const getMoveButtonStyle = useCallback(
    (canMove: boolean): React.CSSProperties => ({
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
    }),
    [t.bgSurface, t.border, t.iconColor, t.placeholder],
  );

  // ---------- Поля модалки настроек ----------
  const modalFields = useMemo(() => {
    return settingsOrder.map((key, index) => {
      const col = columnByKey.get(key);
      if (!col) return { row: index, col: 0, content: null };

      const isSticky = stickyRightSet.has(key);
      const canMoveUp =
        !isSticky && index > 0 && !stickyRightSet.has(settingsOrder[index - 1]);
      const canMoveDown =
        !isSticky &&
        index < settingsOrder.length - 1 &&
        !stickyRightSet.has(settingsOrder[index + 1]);

      const moveButtons = [
        { key: 'up', Icon: IcoChevronUp, canMove: canMoveUp, handler: moveUp },
        { key: 'down', Icon: IcoChevronDown, canMove: canMoveDown, handler: moveDown },
      ];

      return {
        row: index,
        col: 0,
        content: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Checkbox
              theme={t}
              checked={settingsVisible.has(key)}
              onChange={() => toggleVisible(key)}
              label={String(col.header)}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {moveButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => btn.canMove && btn.handler(key)}
                  style={getMoveButtonStyle(btn.canMove)}
                  onMouseEnter={e => {
                    if (btn.canMove) e.currentTarget.style.background = t.navHoverBg;
                  }}
                  onMouseLeave={e => {
                    if (btn.canMove) e.currentTarget.style.background = t.bgSurface;
                  }}
                >
                  <btn.Icon s={16} />
                </button>
              ))}
            </div>
          </div>
        ),
      };
    });
  }, [
    settingsOrder,
    settingsVisible,
    columnByKey,
    stickyRightSet,
    t,
    moveUp,
    moveDown,
    toggleVisible,
    getMoveButtonStyle,
  ]);

  // ---------- Рендер ----------
  return (
    <>
      <div ref={containerRef} style={tableContainerStyle}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            tableLayout: 'auto',
          }}
        >
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
              {displayColumns.map(col => {
                const sortKey = col.key;
                const sortIndex = sortState.findIndex(s => s.key === sortKey);
                const isSorted = sortIndex !== -1;
                const direction = isSorted ? sortState[sortIndex].direction : undefined;
                const originalIndex = columnIndexByKey.get(col.key);
                const stickyStyle =
                  originalIndex !== undefined ? getStickyStyle(originalIndex, true) : {};
                const isSortable = col.sortable !== undefined ? col.sortable : true;

                return (
                  <th
                    key={col.key}
                    style={{
                      ...headerCellStyle,
                      ...stickyStyle,
                      ...col.headerStyle,
                      cursor: isSortable ? 'pointer' : 'default',
                    }}
                    onClick={e => isSortable && handleHeaderClick(sortKey, e)}
                    onMouseEnter={e => {
                      if (isSortable) e.currentTarget.style.background = t.navHoverBg;
                    }}
                    onMouseLeave={e => {
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
            {data.length === 0 ? (
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
              data.map((row, rowIndex) => {
                const isSelected =
                  selectedRowKey !== undefined && row[rowKey] === selectedRowKey;
                const className = rowClassName ? rowClassName(row) : '';
                const customRowStyle = rowStyle ? rowStyle(row) : {};

                return (
                  <tr
                    key={row[rowKey]}
                    className={className}
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      background: isSelected ? `${t.accent}22` : t.bgSurface,
                      borderLeft: isSelected ? `3px solid ${t.accent}` : 'none',
                      transition: 'background 0.15s',
                      animation: 'fadeInRow 0.25s ease forwards',
                      animationDelay: `${rowIndex * 30}ms`,
                      ...customRowStyle,
                    }}
                    onMouseEnter={e => {
                      if (onRowClick && !isSelected)
                        e.currentTarget.style.background = t.navHoverBg;
                    }}
                    onMouseLeave={e => {
                      if (onRowClick && !isSelected)
                        e.currentTarget.style.background = t.bgSurface;
                    }}
                  >
                    {displayColumns.map(col => {
                      const originalIndex = columnIndexByKey.get(col.key);
                      const stickyStyle =
                        originalIndex !== undefined
                          ? getStickyStyle(originalIndex, false)
                          : {};
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
                );
              })
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
        fields={modalFields}
      />
    </>
  );
}