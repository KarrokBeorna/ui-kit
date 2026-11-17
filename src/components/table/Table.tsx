import React, { useState, useMemo, useCallback } from 'react';
import type { Theme } from '../../themes/theme';
import Modal from '../Modal';
import { IcoChevronUp, IcoChevronDown } from '../icons';
import Checkbox from '../inputs/Checkbox';
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

  // ── Встроенные хуки ─────────────────────────
  /** Включить внутреннюю сортировку (useSort). */
  sortable?: boolean;
  /** Ключ localStorage для персиста порядка/видимости колонок. */
  persistKey?: string;
  /** Закреплённые колонки (по умолчанию = stickyRight). */
  pinnedColumns?: string[];
  /** Интервал автообновления, мс. Требует refetch. */
  autoRefreshInterval?: number;
  autoRefreshPaused?: boolean;
  refetch?: () => void | Promise<void>;

  // ── Мобильный режим ─────────────────────────
  /** Автоматический MobileCardList на мобиле. @default true */
  responsive?: boolean;
  /** Поля карточки. По умолчанию — все видимые колонки (кроме actions). */
  mobileFields?: MobileCardField<T>[];
  /** Заголовок карточки. */
  mobileTitleRender?: (row: T) => React.ReactNode;
  /** Максимум строк заголовка (line-clamp). @default 2 (в MobileCardList) */
  mobileTitleMaxLines?: number;
  /** Максимум символов заголовка (посимвольно, с «…»). */
  mobileTitleMaxChars?: number;
  /** Максимальная ширина колонки меток в карточке, px. @default 160 */
  mobileLabelMaxWidth?: number;
  /** Максимум строк метки (line-clamp). `undefined` — без ограничения. */
  mobileLabelMaxLines?: number;
  /**
   * Иконки-действия в футере карточки.
   * Если не передан, автоматически используется render колонки `key="actions"`.
   */
  mobileActions?: (row: T) => React.ReactNode;
  /** Полностью кастомный мобильный рендер. */
  renderMobile?: (data: T[]) => React.ReactNode;

  loading?: boolean;
}

/**
 * Таблица с интегрированными хуками.
 *
 * Внутри автоматически вызываются `useSort`, `usePersistedTableColumns`,
 * `useAutoRefresh` — на страницах их использовать не нужно. Достаточно
 * передать `sortable` / `persistKey` / `autoRefreshInterval` + `refetch`.
 *
 * На мобильных устройствах (`responsive=true`) рендерится `MobileCardList`.
 * Колонка `actions` (созданная через `ActionsColumn`) автоматически
 * выносится в футер карточки — см. `mobileActions`.
 */
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
  const { isMobile } = useResponsive();

  // =========================================================
  // ХУКИ (все — до первого раннего return)
  // =========================================================

  // ---------- Встроенная сортировка ----------
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

  // ---------- Встроенный персист колонок ----------
  const allColumnKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const effectivePinned = pinnedColumns ?? stickyRight;

  const persisted = usePersistedTableColumns(
    persistKey ?? '__unused__',
    allColumnKeys,
    { pinnedKeys: effectivePinned, enabled: !!persistKey },
  );

  // ---------- Встроенный авто-refresh ----------
  const willRenderMobile = responsive && isMobile;

  useAutoRefresh(refetch ?? (() => {}), {
    intervalMs: autoRefreshInterval ?? 30_000,
    paused:
      autoRefreshPaused ||
      !refetch ||
      autoRefreshInterval === undefined ||
      willRenderMobile,
  });

  // ---------- Порядок / видимость ----------
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

  // ---------- Быстрые индексы ----------
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

  // ⚠️ Эти два хука должны быть ДО `if (willRenderMobile) return`,
  // иначе при повороте экрана React падает с «Rendered more/fewer hooks».
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

  const modalFields = useMemo(
    () =>
      settingsOrder.map((key, index) => {
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
          ),
        };
      }),
    [
      settingsOrder,
      settingsVisible,
      columnByKey,
      stickyRightSet,
      t,
      moveUp,
      moveDown,
      toggleVisible,
      getMoveButtonStyle,
    ],
  );

  // ---------- Клик по заголовку ----------
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

  // ---------- Sticky ----------
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

  // ---------- Отображаемые колонки ----------
  const displayColumns = useMemo(() => {
    const uniqueKeys = Array.from(new Set(order.filter((key) => visibleKeys.has(key))));
    return uniqueKeys
      .map((key) => columnByKey.get(key))
      .filter((col): col is Column<T> => col !== undefined);
  }, [order, visibleKeys, columnByKey]);

  // =========================================================
  // ⚠️ ВСЕ хуки выше. Теперь можно делать ранний return.
  // =========================================================

  // ---------- Мобильный режим ----------
  if (willRenderMobile) {
    if (renderMobile) return <>{renderMobile(dataToRender)}</>;

    // Автодетект actions-колонки: если пользователь не передал mobileActions,
    // но в columns есть колонка key="actions", используем её render в футере
    // карточки. Сама колонка исключается из полей `dl`.
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

  // ---------- Десктопный рендер ----------
  return (
    <>
      {/*
        Обёртка с position: relative нужна только ради шестерёнки.
        Она позиционируется абсолютно относительно обёртки и сама двигается
        вместе с таблицей при раскрытии FilterBar / изменении layout.
      */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: fixedHeader ? height : 'auto',
        }}
      >
        {!settingsOpen && (
          <button
            type="button"
            onClick={openSettings}
            aria-label="Настройка таблицы"
            style={{
              position: 'absolute',
              top: -12,
              left: -12,
              zIndex: 10,
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
              padding: 0,
              fontSize: 18,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = t.bgSurface)}
          >
            ⚙
          </button>
        )}

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
                          originalIndex !== undefined
                            ? getStickyStyle(originalIndex, false)
                            : {};
                        const cellContent = col.render
                          ? col.render((row as any)[col.key], row)
                          : (row as any)[col.key];
                        return (
                          <td
                            key={col.key}
                            style={{ ...cellBaseStyle, ...stickyStyle, ...col.style }}
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
        </div>
      </div>

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
        canSubmit
        fields={modalFields}
      />
    </>
  );
}