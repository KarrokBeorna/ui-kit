import React, {
  useState, useMemo, useCallback, useRef, useLayoutEffect, useInsertionEffect,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../../themes/theme';
import Modal from '../Modal';
import Checkbox from '../inputs/Checkbox';
import { IcoChevronUp, IcoChevronDown } from '../icons';
import { useResponsive } from '../../context/ResponsiveContext';
import { MobileCardList, type MobileCardField } from './MobileCardList';
import { useSort, type SortState } from './useSort';
import { usePersistedTableColumns } from './usePersistedTableColumns';
import { useAutoRefresh } from './useAutoRefresh';

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
  sortState?: SortState;
  onSortChange?: (newSortState: SortState) => void;
  initialSort?: SortState;
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
  sortable?: boolean;
  persistKey?: string;
  pinnedColumns?: string[];
  autoRefreshInterval?: number;
  autoRefreshPaused?: boolean;
  refetch?: () => void | Promise<void>;
  responsive?: boolean;
  mobileFields?: MobileCardField<T>[];
  mobileTitleRender?: (row: T) => React.ReactNode;
  mobileTitleMaxLines?: number;
  mobileTitleMaxChars?: number;
  mobileLabelMaxWidth?: number;
  mobileLabelMaxLines?: number;
  mobileActions?: (row: T) => React.ReactNode;
  renderMobile?: (data: T[]) => React.ReactNode;
  loading?: boolean;
}

const TABLE_CSS_ID = 'kbs-table-css';
const TABLE_CSS = `
.kbs-table-gear { transition: background .2s, color .2s, transform .2s; }
@media (hover: hover) {
  .kbs-table-gear:hover { background: var(--kbs-gear-hover) !important; color: var(--kbs-gear-text) !important; }
}
.kbs-table-gear:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 2px; }
.kbs-col-move { transition: background .15s, opacity .15s; }
@media (hover: hover) {
  .kbs-col-move:not(:disabled):hover { background: var(--kbs-gear-hover) !important; }
}
.kbs-col-move:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) {
  .kbs-table-gear, .kbs-col-move { transition: none !important; }
}
`;

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
  sortable = false,
  persistKey,
  pinnedColumns,
  autoRefreshInterval,
  autoRefreshPaused = false,
  refetch,
  responsive = true,
  mobileFields,
  mobileTitleRender,
  mobileTitleMaxLines,
  mobileTitleMaxChars,
  mobileLabelMaxWidth,
  mobileLabelMaxLines,
  mobileActions,
  renderMobile,
  loading = false,
}: TableProps<T>) {
  useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(TABLE_CSS_ID)) return;
    const el = document.createElement('style');
    el.id = TABLE_CSS_ID;
    el.textContent = TABLE_CSS;
    document.head.appendChild(el);
  }, []);

  const { isMobile } = useResponsive();

  /* ---------- Сортировка ---------- */
  const {
    sortedData,
    sortState: internalSortState,
    setSortState: setInternalSortState,
  } = useSort(data, initialSort);

  const sortState = externalSortState !== undefined ? externalSortState : internalSortState;
  const updateSortState = useCallback(
    (newState: SortState) => {
      if (onSortChange) onSortChange(newState);
      else setInternalSortState(newState);
    },
    [onSortChange, setInternalSortState],
  );
  const dataToRender = sortable ? sortedData : data;

  /* ---------- Персист колонок ---------- */
  const allColumnKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const effectivePinned = pinnedColumns ?? stickyRight;
  const persisted = usePersistedTableColumns(
    persistKey ?? '__unused__',
    allColumnKeys,
    { pinnedKeys: effectivePinned, enabled: !!persistKey },
  );

  /* ---------- Авто-refresh ---------- */
  const willRenderMobile = responsive && isMobile;
  useAutoRefresh(refetch ?? (() => {}), {
    intervalMs: autoRefreshInterval ?? 30_000,
    paused:
      autoRefreshPaused || !refetch || autoRefreshInterval === undefined || willRenderMobile,
  });

  /* ---------- Порядок / видимость ---------- */
  const [internalOrder, setInternalOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [internalVisible, setInternalVisible] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.key)),
  );

  const order = externalColumnOrder !== undefined
    ? externalColumnOrder
    : persistKey
      ? persisted.columnOrder
      : internalOrder;

  const visibleKeys = useMemo(
    () =>
      externalVisibleColumns !== undefined
        ? new Set(externalVisibleColumns)
        : persistKey
          ? new Set(persisted.visibleColumns)
          : internalVisible,
    [externalVisibleColumns, persistKey, persisted.visibleColumns, internalVisible],
  );

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

  /* ---------- Модалка настроек ---------- */
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
    } else if (persistKey) {
      persisted.onApplySettings(Array.from(settingsVisible), settingsOrder);
    } else {
      updateOrder(settingsOrder);
      updateVisible(settingsVisible);
    }
    setSettingsOpen(false);
  }, [onApplySettings, persistKey, persisted, settingsVisible, settingsOrder, updateOrder, updateVisible]);

  const toggleVisible = useCallback((key: string) => {
    setSettingsVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const moveUp = useCallback(
    (key: string) => {
      setSettingsOrder((prev) => {
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
      setSettingsOrder((prev) => {
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

  const getMoveButtonStyle = useCallback(
    (canMove: boolean): React.CSSProperties => ({
      width: 22, height: 22, padding: 0,
      background: t.bgSurface,
      border: `1px solid ${t.border}`,
      borderRadius: 4,
      cursor: canMove ? 'pointer' : 'default',
      color: canMove ? t.iconColor : t.placeholder,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1, opacity: canMove ? 1 : 0.3,
      flexShrink: 0,
    }),
    [t.bgSurface, t.border, t.iconColor, t.placeholder],
  );

  /**
   * Компактный список: строка 25.6px (Checkbox size="sm"), gap 12px.
   * Рендерится одним полем Modal (rows=1), чтобы сетка модалки
   * не навязывала свои 44px на каждую колонку.
   *
   * padding по краям обязателен: overflowY:auto клипает и по горизонтали,
   * а кольцо чекбокса (0 0 0 3px) выступает за пределы его бокса.
   */
  const settingsField = useMemo(
    () => ({
      row: 0,
      col: 0,
      content: (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            maxHeight: 'min(56vh, 460px)', overflowY: 'auto',
            padding: '6px 6px', boxSizing: 'border-box',
            overscrollBehavior: 'contain',
          }}
        >
          {settingsOrder.map((key, index) => {
            const col = columnByKey.get(key);
            if (!col) return null;
            const isSticky = stickyRightSet.has(key);
            const canMoveUp =
              !isSticky && index > 0 && !stickyRightSet.has(settingsOrder[index - 1]);
            const canMoveDown =
              !isSticky &&
              index < settingsOrder.length - 1 &&
              !stickyRightSet.has(settingsOrder[index + 1]);
            return (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 8, minHeight: 25.6,
                }}
              >
                <Checkbox
                  theme={t}
                  size="sm"
                  truncate
                  checked={settingsVisible.has(key)}
                  onChange={() => toggleVisible(key)}
                  label={String(col.header)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="kbs-col-move"
                    aria-label={`Переместить «${String(col.header)}» вверх`}
                    disabled={!canMoveUp}
                    onClick={() => canMoveUp && moveUp(key)}
                    style={getMoveButtonStyle(canMoveUp)}
                  >
                    <IcoChevronUp s={14} />
                  </button>
                  <button
                    type="button"
                    className="kbs-col-move"
                    aria-label={`Переместить «${String(col.header)}» вниз`}
                    disabled={!canMoveDown}
                    onClick={() => canMoveDown && moveDown(key)}
                    style={getMoveButtonStyle(canMoveDown)}
                  >
                    <IcoChevronDown s={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ),
    }),
    [settingsOrder, settingsVisible, columnByKey, stickyRightSet, t, toggleVisible, moveUp, moveDown, getMoveButtonStyle],
  );

  /* ---------- Клик по заголовку ---------- */
  const handleHeaderClick = (key: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    let newState: SortState = [];
    if (ctrl) {
      newState = [...sortState];
      const existing = newState.findIndex((s) => s.key === key);
      if (existing !== -1) {
        const current = newState[existing];
        if (current.direction === 'asc') newState[existing] = { key, direction: 'desc' };
        else newState.splice(existing, 1);
      } else {
        newState.push({ key, direction: 'asc' });
      }
    } else {
      const existing = sortState.findIndex((s) => s.key === key);
      if (existing !== -1) {
        if (sortState[existing].direction === 'asc') newState = [{ key, direction: 'desc' }];
        else newState = [];
      } else {
        newState = [{ key, direction: 'asc' }];
      }
    }
    updateSortState(newState);
  };

  /* ---------- Sticky ---------- */
  const firstStickyIndex = useMemo(() => {
    for (let i = 0; i < columns.length; i++) {
      if (stickyRightSet.has(columns[i].key)) return i;
    }
    return -1;
  }, [columns, stickyRightSet]);

  const getStickyStyle = useCallback(
    (colIndex: number, isHeader = false): React.CSSProperties => {
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

  const displayColumns = useMemo(() => {
    const uniqueKeys = Array.from(new Set(order.filter((key) => visibleKeys.has(key))));
    return uniqueKeys
      .map((key) => columnByKey.get(key))
      .filter((col): col is Column<T> => col !== undefined);
  }, [order, visibleKeys, columnByKey]);

  /* ---------- Шестерёнка в портале (не обрезается overflow:hidden) ---------- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [gearPos, setGearPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (willRenderMobile || typeof window === 'undefined') { setGearPos(null); return; }
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 8 || r.top > window.innerHeight - 8) {
        setGearPos(null);
        return;
      }
      const top = r.top - 12;
      const left = r.left - 12;
      setGearPos((prev) =>
        prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5
          ? prev
          : { top, left },
      );
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [willRenderMobile, height, fixedHeader]);

  // =========================================================
  // ⚠️ ВСЕ хуки выше. Теперь можно делать ранний return.
  // =========================================================

  if (willRenderMobile) {
    if (renderMobile) return <>{renderMobile(dataToRender)}</>;

    const actionsColumn = columns.find((c) => c.key === 'actions');
    const autoActions = actionsColumn?.render
      ? (row: T) => actionsColumn.render!((row as any)[actionsColumn.key], row)
      : undefined;
    const effectiveActions = mobileActions ?? autoActions;

    const fields: MobileCardField<T>[] =
      mobileFields ??
      displayColumns
        .filter((col) => col.key !== 'actions')
        .map((col) => ({
          label: typeof col.header === 'string' ? col.header : col.key,
          render: (row: T) =>
            col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key],
        }));

    return (
      <MobileCardList
        t={t}
        data={dataToRender}
        rowKey={rowKey as keyof T}
        fields={fields}
        titleRender={mobileTitleRender}
        titleMaxLines={mobileTitleMaxLines}
        titleMaxChars={mobileTitleMaxChars}
        labelMaxWidth={mobileLabelMaxWidth}
        labelMaxLines={mobileLabelMaxLines}
        onRowClick={onRowClick}
        actions={effectiveActions}
        rowStyle={rowStyle}
        rowClassName={rowClassName}
        loading={loading}
        autoRefreshInterval={autoRefreshInterval}
        autoRefreshPaused={autoRefreshPaused}
        refetch={refetch}
      />
    );
  }

  return (
    <>
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          width: '100%',
          height: fixedHeader ? height : 'auto',
        }}
      >
        <div style={tableContainerStyle}>
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
                {displayColumns.map((col) => {
                  const sortKey = col.key;
                  const sortIndex = sortState.findIndex((s) => s.key === sortKey);
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
              {dataToRender.length === 0 ? (
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
                    {loading ? 'Загрузка…' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                dataToRender.map((row) => {
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
                        ...customRowStyle,
                      }}
                      onMouseEnter={(e) => {
                        if (onRowClick && !isSelected)
                          e.currentTarget.style.background = t.navHoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (onRowClick && !isSelected)
                          e.currentTarget.style.background = t.bgSurface;
                      }}
                    >
                      {displayColumns.map((col) => {
                        const originalIndex = columnIndexByKey.get(col.key);
                        const stickyStyle =
                          originalIndex !== undefined ? getStickyStyle(originalIndex, false) : {};
                        const cellContent = col.render
                          ? col.render((row as any)[col.key], row)
                          : (row as any)[col.key];
                        return (
                          <td key={col.key} style={{ ...cellBaseStyle, ...stickyStyle, ...col.style }}>
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
        </div>
      </div>

      {!settingsOpen && gearPos && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          className="kbs-table-gear"
          onClick={openSettings}
          aria-label="Настройка таблицы"
          title="Настройка таблицы"
          style={{
            position: 'fixed',
            top: gearPos.top,
            left: gearPos.left,
            zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            background: t.bgSurface,
            border: `1px solid ${t.border}`,
            color: t.iconColor,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: 0, fontSize: 18, lineHeight: 1,
            '--kbs-gear-hover': t.navHoverBg,
            '--kbs-gear-text': t.text,
            '--kbs-gear-accent': t.accent,
          } as React.CSSProperties}
        >
          ⚙
        </button>,
        document.body,
      )}

      <Modal
        theme={t}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOk={applySettings}
        title="Настройка таблицы"
        columns={1}
        rows={1}
        okText="Применить"
        cancelText="Отмена"
        canSubmit
        fields={[settingsField]}
      />
    </>
  );
}