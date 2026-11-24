// Table.tsx — таблица + мобильные карточки + фабрика колонки действий.
//
// ИЗМЕНЕНИЯ:
//  • НОВОЕ: действие 'photos' (onPhotos / photosIcon) — просмотр фотографий
//    записи в модальном окне (PhotoViewerModal). Ресурс `${acl}.photos`,
//    подпись по умолчанию «Фотографии», порядок: edit → download → photos → log → delete;
//  • шестерёнка «Настройка таблицы» следует за таблицей при любом сдвиге
//    layout (watchLayout наблюдает за элементом и всеми его предками);
//  • ACL: Column.acl / MobileCardField.acl скрывают колонки и поля карточек;
//    ActionsColumn({ acl: 'users' }) сам объявляет и проверяет ресурсы
//    users.edit / users.download / users.photos / users.log / users.delete / users.restore;
//  • labels — человекочитаемые имена действий для редактора ролей;
//  • allow — точечное скрытие действия для конкретной строки (например
//    «системную роль удалить нельзя»), не влияющее на реестр ресурсов;
//  • ресурсы объявляются только для действий, у которых есть обработчик.
import React, {
  useState, useMemo, useCallback, useRef, useLayoutEffect, Fragment, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import Modal from './Modal';
import Checkbox from './Checkbox';
import Button from './Button';
import { IcoChevronUp, IcoChevronDown } from './icons';
import { useResponsive } from '../context/AppContext';
import { useAutoRefresh, useStyleTag, watchLayout } from '../hooks';
import { useAcl, useAclResource, registerResource } from '../acl';

/* ───────────────────────── Сортировка ───────────────────────── */

export type SortDirection = 'asc' | 'desc';
/** Состояние многоуровневой сортировки. */
export type SortState = { key: string; direction: SortDirection }[];

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Многоуровневая сортировка массива объектов (пустые значения — в конец). */
export function useSort<T extends Record<string, any>>(data: T[], initialSort: SortState = []) {
  const [sortState, setSortState] = useState<SortState>(initialSort);
  const sortedData = useMemo(() => {
    if (sortState.length === 0) return data;
    const sorted = [...data];
    sorted.sort((a, b) => {
      for (const { key, direction } of sortState) {
        const aVal = a[key], bVal = b[key];
        const aEmpty = aVal === null || aVal === undefined || aVal === '';
        const bEmpty = bVal === null || bVal === undefined || bVal === '';
        if (aEmpty && bEmpty) continue;
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        const cmp = compareValues(aVal, bVal);
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [data, sortState]);
  return { sortedData, sortState, setSortState };
}

/* ───────────────────────── Персист колонок (внутренний) ───────────────────────── */

const STORAGE_PREFIX = 'table-columns:';
const hasStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

interface StoredColumns { order: string[]; visible: string[]; }

function loadColumns(key: string): StoredColumns | null {
  if (!hasStorage) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(parsed?.order) && Array.isArray(parsed?.visible)) {
      return { order: Array.from(new Set<string>(parsed.order)), visible: Array.from(new Set<string>(parsed.visible)) };
    }
  } catch { /* ignore */ }
  return null;
}

function saveColumns(key: string, value: StoredColumns) {
  if (!hasStorage) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function reconcileOrder(stored: string[], allKeys: string[]): string[] {
  const allSet = new Set(allKeys);
  const result = stored.filter((k) => allSet.has(k));
  for (const k of allKeys) if (!result.includes(k)) result.push(k);
  return result;
}

const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function usePersistedTableColumns(tableKey: string, allColumnKeys: string[], pinnedKeys: string[], enabled: boolean) {
  const storageKey = STORAGE_PREFIX + tableKey;
  const pinnedSignature = pinnedKeys.join('\u0001');
  const pinned = useMemo(() => pinnedKeys, [pinnedSignature]); // eslint-disable-line react-hooks/exhaustive-deps
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const persistableKeys = useMemo(() => allColumnKeys.filter((k) => !pinnedSet.has(k)), [allColumnKeys, pinnedSet]);
  const signature = persistableKeys.join('\u0001');

  const [order, setOrder] = useState<string[]>(() => {
    if (!enabled) return persistableKeys;
    const s = loadColumns(storageKey);
    return s ? reconcileOrder(s.order, persistableKeys) : persistableKeys;
  });
  const [visible, setVisible] = useState<string[]>(() => {
    if (!enabled) return persistableKeys;
    const s = loadColumns(storageKey);
    if (!s) return persistableKeys;
    const allSet = new Set(persistableKeys);
    const storedOrderSet = new Set(s.order);
    const result = s.visible.filter((k) => allSet.has(k));
    for (const k of persistableKeys) if (!storedOrderSet.has(k) && !result.includes(k)) result.push(k);
    return result;
  });

  const prevKeysRef = useRef<string[]>(persistableKeys);
  const allKeysRef = useRef<string[]>(persistableKeys);
  allKeysRef.current = persistableKeys;

  useEffect(() => {
    const prevSet = new Set(prevKeysRef.current);
    const current = allKeysRef.current;
    const currentSet = new Set(current);
    const added = current.filter((k) => !prevSet.has(k));
    const removed = prevKeysRef.current.some((k) => !currentSet.has(k));
    if (added.length > 0 || removed) {
      setOrder((prev) => { const next = reconcileOrder(prev, current); return sameArr(prev, next) ? prev : next; });
      setVisible((prev) => {
        const next = prev.filter((k) => currentSet.has(k));
        for (const k of added) if (!next.includes(k)) next.push(k);
        return sameArr(prev, next) ? prev : next;
      });
    }
    prevKeysRef.current = current;
  }, [signature]);

  useEffect(() => { if (enabled) saveColumns(storageKey, { order, visible }); }, [storageKey, order, visible, enabled]);

  const onApplySettings = useCallback((v: string[], o: string[]) => {
    setVisible(v.filter((k) => !pinnedSet.has(k)));
    setOrder(o.filter((k) => !pinnedSet.has(k)));
  }, [pinnedSet]);

  const columnOrder = useMemo(() => [...order, ...pinned], [order, pinned]);
  const visibleColumns = useMemo(() => [...visible, ...pinned], [visible, pinned]);
  return { columnOrder, visibleColumns, onApplySettings };
}

/* ───────────────────────── ActionsColumn ───────────────────────── */

/** Вид действия в колонке «Действия». */
export type ActionKind = 'edit' | 'download' | 'photos' | 'log' | 'delete' | 'restore';

export interface ActionsColumnOptions<T> {
  /** Тема оформления. */
  theme: Theme;
  onEdit?: (row: T) => void;
  onDownload?: (row: T) => void;
  /** Просмотр фотографий записи (открывает PhotoViewerModal). Ресурс `${acl}.photos`. */
  onPhotos?: (row: T) => void;
  onLog?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRestore?: (row: T) => void;
  /** Признак удалённой записи. @default row.is_deleted === true */
  isDeleted?: (row: T) => boolean;
  /** Ключ колонки. @default 'actions' */
  key?: string;
  /** Заголовок. @default 'Действия' */
  header?: string;
  editIcon?: React.ReactNode;
  downloadIcon?: React.ReactNode;
  /** Иконка действия «Фотографии». @default '🖼' */
  photosIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  restoreIcon?: React.ReactNode;
  logIcon?: React.ReactNode;
  gap?: number;
  extraActions?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Передавайте из useResponsive(). */
  isMobile?: boolean;
  buttonSize?: 'sm' | 'md';
  /** Префикс ресурсов: 'users' → users.edit, users.photos, users.delete, … Без пропа права не проверяются. */
  acl?: string;
  /** Имена действий для редактора ролей: { photos: 'Журнал: фотографии' }. */
  labels?: Partial<Record<ActionKind, string>>;
  /** Скрыть действие для конкретной строки (например фото нет — кнопку не показываем). На реестр не влияет. */
  allow?: (action: ActionKind, row: T) => boolean;
}

const ACTION_LABELS: Record<ActionKind, string> = {
  edit: 'Изменить', download: 'Скачать', photos: 'Фотографии',
  log: 'Журнал', delete: 'Удалить', restore: 'Восстановить',
};

/** Ячейка действий — компонент, чтобы читать права из контекста и объявлять ресурсы. */
function ActionsCell<T>({ row, o }: { row: T; o: ActionsColumnOptions<T> }) {
  const { can } = useAcl();
  const {
    theme, onEdit, onDownload, onPhotos, onLog, onDelete, onRestore,
    isDeleted = (r: any) => r?.is_deleted === true,
    header = 'Действия',
    editIcon = '✎', downloadIcon = '⬇', photosIcon = '🖼', logIcon = '⌸', deleteIcon = '✕', restoreIcon = '⟳',
    extraActions, isMobile = false, buttonSize, acl, labels, allow,
  } = o;
  const gap = o.gap ?? (isMobile ? 8 : 6);
  const size = buttonSize ?? (isMobile ? 'md' : 'sm');

  const idOf = (kind: ActionKind) => (acl ? `${acl}.${kind}` : undefined);
  const labelOf = (kind: ActionKind) => labels?.[kind] ?? `${header}: ${ACTION_LABELS[kind]}`;
  const show = (kind: ActionKind) =>
    (!acl || can(idOf(kind))) && (!allow || allow(kind, row));

  useAclResource('button', onEdit ? idOf('edit') : undefined, labelOf('edit'));
  useAclResource('button', onDownload ? idOf('download') : undefined, labelOf('download'));
  useAclResource('button', onPhotos ? idOf('photos') : undefined, labelOf('photos'));
  useAclResource('button', onLog ? idOf('log') : undefined, labelOf('log'));
  useAclResource('button', onDelete ? idOf('delete') : undefined, labelOf('delete'));
  useAclResource('button', onRestore ? idOf('restore') : undefined, labelOf('restore'));

  const buttons: React.ReactNode[] = [];
  if (isDeleted(row)) {
    if (onRestore && show('restore')) {
      buttons.push(<Button key="restore" icon={restoreIcon} variant="primary" outline size={size}
        aria-label="Восстановить" onClick={() => onRestore(row)} theme={theme} />);
    }
  } else {
    if (onEdit && show('edit')) {
      buttons.push(<Button key="edit" icon={editIcon} variant="primary" outline size={size}
        aria-label="Редактировать" onClick={() => onEdit(row)} theme={theme} />);
    }
    if (onDownload && show('download')) {
      buttons.push(<Button key="download" icon={downloadIcon} variant="primary" outline size={size}
        aria-label="Скачать" onClick={() => onDownload(row)} theme={theme} />);
    }
    if (onPhotos && show('photos')) {
      buttons.push(<Button key="photos" icon={photosIcon} variant="primary" outline size={size}
        aria-label="Фотографии" title="Фотографии" onClick={() => onPhotos(row)} theme={theme} />);
    }
    if (onLog && show('log')) {
      buttons.push(<Button key="log" icon={logIcon} variant="primary" outline size={size}
        aria-label="Журнал" onClick={() => onLog(row)} theme={theme} />);
    }
    if (onDelete && show('delete')) {
      buttons.push(<Button key="delete" icon={deleteIcon} variant="danger" outline size={size}
        aria-label="Удалить" onClick={() => onDelete(row)} theme={theme} />);
    }
  }
  const extra = extraActions?.(row);
  if (buttons.length === 0 && !extra) return null;
  return <div style={{ display: 'flex', gap, alignItems: 'center' }}>{buttons}{extra}</div>;
}

/** Фабрика колонки «Действия» (не хук). */
export function ActionsColumn<T>(options: ActionsColumnOptions<T>) {
  const { key = 'actions', header = 'Действия', sortable = false } = options;
  return {
    key, header, sortable,
    render: (_: unknown, row: T): React.ReactNode => <ActionsCell row={row} o={options} />,
  };
}

/* ───────────────────────── MobileCardList ───────────────────────── */

/** Поле мобильной карточки. */
export interface MobileCardField<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  hidden?: boolean;
  /** Идентификатор ресурса. Нет права — поле скрыто. */
  acl?: string;
}

export interface MobileCardListProps<T> {
  /** Тема оформления. */
  t: Theme;
  /** Данные. */
  data: T[];
  /** Ключ строки. */
  rowKey: keyof T;
  /** Поля карточки. */
  fields: MobileCardField<T>[];
  /** Заголовок карточки. */
  titleRender?: (row: T) => React.ReactNode;
  /** Максимум строк заголовка. @default 2 */
  titleMaxLines?: number;
  /** Максимум символов заголовка. */
  titleMaxChars?: number;
  /** Клик по карточке. */
  onRowClick?: (row: T) => void;
  /** Действия в футере карточки. */
  actions?: (row: T) => React.ReactNode;
  /** Текст пустого состояния. @default 'Нет данных' */
  emptyText?: string;
  rowStyle?: (row: T) => React.CSSProperties;
  rowClassName?: (row: T) => string;
  /** Скелетон загрузки. */
  loading?: boolean;
  /** Порция догрузки. @default 20 */
  pageSize?: number;
  /** Зазор между карточками. @default 10 */
  gap?: number;
  /** Максимальная ширина колонки меток, px. @default 160 */
  labelMaxWidth?: number;
  /** Максимум строк метки. */
  labelMaxLines?: number;
  /** Интервал автообновления, мс. */
  autoRefreshInterval?: number;
  autoRefreshPaused?: boolean;
  refetch?: () => void | Promise<void>;
}

/** Мобильный список карточек с lazy-догрузкой и скелетоном. */
export function MobileCardList<T extends Record<string, any>>({
  t, data, rowKey, fields, titleRender, titleMaxLines = 2, titleMaxChars,
  onRowClick, actions, emptyText = 'Нет данных', rowStyle, rowClassName,
  loading = false, pageSize = 20, gap = 10, labelMaxWidth = 160, labelMaxLines,
  autoRefreshInterval, autoRefreshPaused = false, refetch,
}: MobileCardListProps<T>) {
  const { can } = useAcl();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useAutoRefresh(refetch ?? (() => {}), {
    intervalMs: autoRefreshInterval ?? 30_000,
    paused: autoRefreshPaused || !refetch || autoRefreshInterval === undefined,
  });

  useEffect(() => { setVisibleCount(pageSize); }, [data, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((c) => Math.min(c + pageSize, data.length));
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [data.length, pageSize]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ height: 16, width: '60%', background: t.border, borderRadius: 4, marginBottom: 10 }} />
            {[1, 2, 3].map((k) => (
              <div key={k} style={{ height: 12, background: t.borderSubtle, borderRadius: 4, marginBottom: 6, width: `${70 + k * 10}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', color: t.placeholder, background: t.bgSurface,
        borderRadius: 12, border: `1px solid ${t.border}`, fontSize: 14,
      }}>
        {emptyText}
      </div>
    );
  }

  const visibleFields = fields.filter((f) => !f.hidden && can(f.acl));
  const hasMore = visibleCount < data.length;
  const slice = data.slice(0, visibleCount);

  const renderTitle = (row: T): React.ReactNode => {
    if (!titleRender) return null;
    const raw = titleRender(row);
    if (titleMaxChars && typeof raw === 'string' && raw.length > titleMaxChars) return raw.slice(0, titleMaxChars - 1) + '…';
    return raw;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {slice.map((row) => {
        const clickable = !!onRowClick;
        return (
          <div key={String(row[rowKey])}
            className={rowClassName ? rowClassName(row) : ''}
            onClick={clickable ? () => onRowClick!(row) : undefined}
            onTouchStart={(e) => { if (clickable) e.currentTarget.style.opacity = '0.85'; }}
            onTouchEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
            onTouchCancel={(e) => { e.currentTarget.style.opacity = '1'; }}
            style={{
              background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12,
              padding: 14, color: t.text, cursor: clickable ? 'pointer' : 'default',
              boxShadow: t.shadow, transition: 'opacity 0.15s, box-shadow 0.15s',
              ...(rowStyle ? rowStyle(row) : null),
            }}>
            {titleRender && (
              <div style={{
                fontWeight: 600, fontSize: 15, marginBottom: 10, color: t.text,
                display: '-webkit-box', WebkitLineClamp: titleMaxLines, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', wordBreak: 'break-word',
              }}>
                {renderTitle(row)}
              </div>
            )}
            <dl style={{
              margin: 0, display: 'grid',
              gridTemplateColumns: `minmax(0, ${labelMaxWidth}px) minmax(0, 1fr)`,
              gap: '6px 12px', fontSize: 13, lineHeight: 1.45, alignItems: 'start',
            }}>
              {visibleFields.map((f) => (
                <Fragment key={f.label}>
                  <dt style={{
                    color: t.textMuted, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal',
                    ...(labelMaxLines != null ? {
                      display: '-webkit-box', WebkitLineClamp: labelMaxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    } : null),
                  }}>
                    {f.label}
                  </dt>
                  <dd style={{ margin: 0, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.render(row)}
                  </dd>
                </Fragment>
              ))}
            </dl>
            {actions && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {actions(row)}
              </div>
            )}
          </div>
        );
      })}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      {hasMore && (
        <button type="button" onClick={() => setVisibleCount((c) => Math.min(c + pageSize, data.length))}
          style={{
            minHeight: 44, padding: '10px 18px', background: 'transparent',
            border: `1px dashed ${t.border}`, borderRadius: 10, color: t.textMuted, fontSize: 13, cursor: 'pointer',
          }}>
          Показать ещё ({data.length - visibleCount})
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Table ───────────────────────── */

/** Колонка таблицы. */
export interface Column<T extends Record<string, any> = any> {
  key: string;
  header: React.ReactNode;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  /** Идентификатор ресурса. Нет права — колонка скрыта. */
  acl?: string;
}

export interface TableProps<T extends Record<string, any>> {
  /** Тема оформления. */
  theme: Theme;
  /** Колонки. */
  columns: Column<T>[];
  /** Данные. */
  data: T[];
  /** Ключ строки. @default 'id' */
  rowKey?: string;
  /** Controlled-сортировка. */
  sortState?: SortState;
  /** Колбэк сортировки (Ctrl/Cmd — мульти). */
  onSortChange?: (newSortState: SortState) => void;
  /** Начальная сортировка (uncontrolled). */
  initialSort?: SortState;
  /** Липкая шапка + скролл контейнера. */
  fixedHeader?: boolean;
  /** Высота контейнера при fixedHeader. @default '400px' */
  height?: string | number;
  /** Максимальная ширина ячейки, px. @default 300 */
  columnMaxWidth?: number;
  /** Ключи колонок, прижатых вправо (sticky). */
  stickyRight?: string[];
  /** Клик по строке. */
  onRowClick?: (row: T) => void;
  /** Ключ выделенной строки. */
  selectedRowKey?: string | number;
  rowClassName?: (row: T) => string;
  rowStyle?: (row: T) => React.CSSProperties;
  /** Controlled-порядок колонок. */
  columnOrder?: string[];
  /** Controlled-видимость колонок. */
  visibleColumns?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  onVisibleColumnsChange?: (visible: string[]) => void;
  onApplySettings?: (visible: string[], order: string[]) => void;
  /** Включить локальную сортировку. */
  sortable?: boolean;
  /** Ключ персиста колонок в localStorage. */
  persistKey?: string;
  /** Всегда видимые колонки в конце. */
  pinnedColumns?: string[];
  /** Интервал автообновления, мс. */
  autoRefreshInterval?: number;
  autoRefreshPaused?: boolean;
  refetch?: () => void | Promise<void>;
  /** Карточки на узком экране. @default true */
  responsive?: boolean;
  mobileFields?: MobileCardField<T>[];
  mobileTitleRender?: (row: T) => React.ReactNode;
  mobileTitleMaxLines?: number;
  mobileTitleMaxChars?: number;
  mobileLabelMaxWidth?: number;
  mobileLabelMaxLines?: number;
  mobileActions?: (row: T) => React.ReactNode;
  /** Полностью кастомный мобильный рендер. */
  renderMobile?: (data: T[]) => React.ReactNode;
  /** Состояние загрузки. */
  loading?: boolean;
}

const TABLE_CSS = `
.kbs-table-gear { transition: background .2s, color .2s, transform .2s; }
@media (hover: hover) { .kbs-table-gear:hover { background: var(--kbs-gear-hover) !important; color: var(--kbs-gear-text) !important; } }
.kbs-table-gear:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 2px; }
.kbs-col-move { transition: background .15s, opacity .15s; }
@media (hover: hover) { .kbs-col-move:not(:disabled):hover { background: var(--kbs-gear-hover) !important; } }
.kbs-col-move:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) { .kbs-table-gear, .kbs-col-move { transition: none !important; } }
`;

/**
 * Таблица с сортировкой, настройкой колонок (шестерёнка), sticky-колонками,
 * персистом и автоматическим мобильным режимом (карточки).
 */
export default function Table<T extends Record<string, any>>({
  theme: t, columns, data, rowKey = 'id',
  sortState: externalSortState, onSortChange, initialSort = [],
  fixedHeader = false, height = '400px', columnMaxWidth = 300, stickyRight = [],
  onRowClick, selectedRowKey, rowClassName, rowStyle,
  columnOrder: externalColumnOrder, visibleColumns: externalVisibleColumns,
  onColumnOrderChange, onVisibleColumnsChange, onApplySettings,
  sortable = false, persistKey, pinnedColumns,
  autoRefreshInterval, autoRefreshPaused = false, refetch,
  responsive = true, mobileFields, mobileTitleRender, mobileTitleMaxLines, mobileTitleMaxChars,
  mobileLabelMaxWidth, mobileLabelMaxLines, mobileActions, renderMobile, loading = false,
}: TableProps<T>) {
  useStyleTag('kbs-table-css', TABLE_CSS);
  const { isMobile } = useResponsive();
  const { can } = useAcl();

  /* Сортировка */
  const { sortedData, sortState: internalSortState, setSortState: setInternalSortState } = useSort(data, initialSort);
  const sortState = externalSortState !== undefined ? externalSortState : internalSortState;
  const updateSortState = useCallback((newState: SortState) => {
    if (onSortChange) onSortChange(newState);
    else setInternalSortState(newState);
  }, [onSortChange, setInternalSortState]);
  const dataToRender = sortable ? sortedData : data;

  /* Персист колонок */
  const allColumnKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const effectivePinned = pinnedColumns ?? stickyRight;
  const persisted = usePersistedTableColumns(persistKey ?? '__unused__', allColumnKeys, effectivePinned, !!persistKey);

  /* Колонки с ACL объявляют себя ресурсами */
  useEffect(() => {
    for (const col of columns) {
      if (col.acl) registerResource({ id: col.acl, kind: 'field', label: String(col.header) });
    }
  }, [columns]);

  /* Авто-refresh */
  const willRenderMobile = responsive && isMobile;
  useAutoRefresh(refetch ?? (() => {}), {
    intervalMs: autoRefreshInterval ?? 30_000,
    paused: autoRefreshPaused || !refetch || autoRefreshInterval === undefined || willRenderMobile,
  });

  /* Порядок / видимость */
  const [internalOrder, setInternalOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [internalVisible, setInternalVisible] = useState<Set<string>>(() => new Set(columns.map((c) => c.key)));
  const order = externalColumnOrder !== undefined ? externalColumnOrder : persistKey ? persisted.columnOrder : internalOrder;
  const visibleKeys = useMemo(() =>
    externalVisibleColumns !== undefined ? new Set(externalVisibleColumns)
      : persistKey ? new Set(persisted.visibleColumns)
        : internalVisible,
    [externalVisibleColumns, persistKey, persisted.visibleColumns, internalVisible]);

  const columnByKey = useMemo(() => {
    const map = new Map<string, Column<T>>();
    for (const col of columns) map.set(col.key, col);
    return map;
  }, [columns]);

  const stickyRightSet = useMemo(() => new Set(stickyRight), [stickyRight]);

  const updateOrder = useCallback((newOrder: string[]) => {
    if (onColumnOrderChange) onColumnOrderChange(newOrder);
    else setInternalOrder(newOrder);
  }, [onColumnOrderChange]);
  const updateVisible = useCallback((newVisible: Set<string>) => {
    if (onVisibleColumnsChange) onVisibleColumnsChange(Array.from(newVisible));
    else setInternalVisible(newVisible);
  }, [onVisibleColumnsChange]);

  /* Модалка настроек */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOrder, setSettingsOrder] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState<Set<string>>(new Set());

  const openSettings = useCallback(() => {
    setSettingsOrder([...order]);
    setSettingsVisible(new Set(visibleKeys));
    setSettingsOpen(true);
  }, [order, visibleKeys]);

  const applySettings = useCallback(() => {
    if (onApplySettings) onApplySettings(Array.from(settingsVisible), settingsOrder);
    else if (persistKey) persisted.onApplySettings(Array.from(settingsVisible), settingsOrder);
    else { updateOrder(settingsOrder); updateVisible(settingsVisible); }
    setSettingsOpen(false);
  }, [onApplySettings, persistKey, persisted, settingsVisible, settingsOrder, updateOrder, updateVisible]);

  const toggleVisible = useCallback((key: string) => {
    setSettingsVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const moveColumn = useCallback((key: string, dir: -1 | 1) => {
    setSettingsOrder((prev) => {
      const idx = prev.indexOf(key);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      if (stickyRightSet.has(key) || stickyRightSet.has(prev[target])) return prev;
      const next = [...prev];
      [next[target], next[idx]] = [next[idx], next[target]];
      return next;
    });
  }, [stickyRightSet]);

  const getMoveButtonStyle = useCallback((canMove: boolean): React.CSSProperties => ({
    width: 22, height: 22, padding: 0, background: t.bgSurface,
    border: `1px solid ${t.border}`, borderRadius: 4,
    cursor: canMove ? 'pointer' : 'default',
    color: canMove ? t.iconColor : t.placeholder,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, opacity: canMove ? 1 : 0.3, flexShrink: 0,
  }), [t.bgSurface, t.border, t.iconColor, t.placeholder]);

  const settingsField = useMemo(() => ({
    row: 0, col: 0,
    content: (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        maxHeight: 'min(56vh, 460px)', overflowY: 'auto',
        padding: '6px 6px', boxSizing: 'border-box', overscrollBehavior: 'contain',
      }}>
        {settingsOrder.map((key, index) => {
          const col = columnByKey.get(key);
          if (!col || !can(col.acl)) return null;
          const isSticky = stickyRightSet.has(key);
          const canUp = !isSticky && index > 0 && !stickyRightSet.has(settingsOrder[index - 1]);
          const canDown = !isSticky && index < settingsOrder.length - 1 && !stickyRightSet.has(settingsOrder[index + 1]);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 25.6 }}>
              <Checkbox theme={t} size="sm" truncate checked={settingsVisible.has(key)}
                onChange={() => toggleVisible(key)} label={String(col.header)} style={{ flex: 1, minWidth: 0 }} />
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button type="button" className="kbs-col-move" aria-label={`Переместить «${String(col.header)}» вверх`}
                  disabled={!canUp} onClick={() => moveColumn(key, -1)} style={getMoveButtonStyle(canUp)}>
                  <IcoChevronUp s={14} />
                </button>
                <button type="button" className="kbs-col-move" aria-label={`Переместить «${String(col.header)}» вниз`}
                  disabled={!canDown} onClick={() => moveColumn(key, 1)} style={getMoveButtonStyle(canDown)}>
                  <IcoChevronDown s={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ),
  }), [settingsOrder, settingsVisible, columnByKey, stickyRightSet, t, toggleVisible, moveColumn, getMoveButtonStyle, can]);

  /* Клик по заголовку */
  const handleHeaderClick = (key: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    let newState: SortState = [];
    const existing = sortState.findIndex((s) => s.key === key);
    if (ctrl) {
      newState = [...sortState];
      if (existing !== -1) {
        if (newState[existing].direction === 'asc') newState[existing] = { key, direction: 'desc' };
        else newState.splice(existing, 1);
      } else newState.push({ key, direction: 'asc' });
    } else if (existing !== -1) {
      newState = sortState[existing].direction === 'asc' ? [{ key, direction: 'desc' }] : [];
    } else {
      newState = [{ key, direction: 'asc' }];
    }
    updateSortState(newState);
  };

  /* Sticky */
  const displayColumns = useMemo(() => {
    const uniqueKeys = Array.from(new Set(order.filter((key) => visibleKeys.has(key))));
    return uniqueKeys
      .map((key) => columnByKey.get(key))
      .filter((col): col is Column<T> => col !== undefined && can(col.acl));
  }, [order, visibleKeys, columnByKey, can]);

  const firstStickyKey = useMemo(() => displayColumns.find((c) => stickyRightSet.has(c.key))?.key, [displayColumns, stickyRightSet]);

  const getStickyStyle = useCallback((key: string, isHeader = false): React.CSSProperties => {
    if (!stickyRightSet.has(key)) return {};
    return {
      position: 'sticky', right: 0, zIndex: isHeader ? 5 : 3,
      background: t.bgSurface,
      boxShadow: key === firstStickyKey ? `inset 2px 0 ${t.border}` : 'none',
    };
  }, [stickyRightSet, firstStickyKey, t.bgSurface, t.border]);

  const cellBaseStyle: React.CSSProperties = {
    padding: '10px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: columnMaxWidth, borderRight: `1px solid ${t.borderSubtle}`,
    color: t.text, textAlign: 'left', background: t.bgSurface,
  };
  const headerCellStyle: React.CSSProperties = {
    ...cellBaseStyle, fontWeight: 600, cursor: 'default', transition: 'background 0.15s',
    position: 'sticky', top: 0, zIndex: 3,
  };

  /* Шестерёнка в портале: следует за таблицей при любом сдвиге layout */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [gearPos, setGearPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (willRenderMobile || typeof window === 'undefined') { setGearPos(null); return; }
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 8 || r.top > window.innerHeight - 8) { setGearPos(null); return; }
      const top = r.top - 12, left = r.left - 12;
      setGearPos((prev) => prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5 ? prev : { top, left });
    };
    update();
    return watchLayout(el, update);
  }, [willRenderMobile, height, fixedHeader]);

  /* ===== Мобильный режим (все хуки выше) ===== */
  if (willRenderMobile) {
    if (renderMobile) return <>{renderMobile(dataToRender)}</>;
    const actionsColumn = columns.find((c) => c.key === 'actions');
    const autoActions = actionsColumn?.render
      ? (row: T) => actionsColumn.render!((row as any)[actionsColumn.key], row)
      : undefined;
    const fields: MobileCardField<T>[] = mobileFields ?? displayColumns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({
        label: typeof col.header === 'string' ? col.header : col.key,
        render: (row: T) => col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key],
      }));
    return (
      <MobileCardList t={t} data={dataToRender} rowKey={rowKey as keyof T} fields={fields}
        titleRender={mobileTitleRender} titleMaxLines={mobileTitleMaxLines} titleMaxChars={mobileTitleMaxChars}
        labelMaxWidth={mobileLabelMaxWidth} labelMaxLines={mobileLabelMaxLines}
        onRowClick={onRowClick} actions={mobileActions ?? autoActions}
        rowStyle={rowStyle} rowClassName={rowClassName} loading={loading}
        autoRefreshInterval={autoRefreshInterval} autoRefreshPaused={autoRefreshPaused} refetch={refetch} />
    );
  }

  /* ===== Desktop ===== */
  return (
    <>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: fixedHeader ? height : 'auto' }}>
        <div style={{
          width: '100%', overflow: fixedHeader ? 'auto' : 'visible', height: fixedHeader ? height : 'auto',
          border: `1px solid ${t.border}`, borderRadius: 10, background: t.bgSurface,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'auto' }}>
            <thead style={{
              position: fixedHeader ? 'sticky' : 'static', top: 0, zIndex: 5,
              background: t.bgSurface, boxShadow: `0 2px 0 ${t.border}`,
            }}>
              <tr>
                {displayColumns.map((col) => {
                  const sortIndex = sortState.findIndex((s) => s.key === col.key);
                  const isSorted = sortIndex !== -1;
                  const direction = isSorted ? sortState[sortIndex].direction : undefined;
                  const isSortable = col.sortable !== undefined ? col.sortable : true;
                  return (
                    <th key={col.key} scope="col"
                      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                      style={{
                        ...headerCellStyle, ...getStickyStyle(col.key, true), ...col.headerStyle,
                        cursor: isSortable ? 'pointer' : 'default',
                      }}
                      onClick={(e) => isSortable && handleHeaderClick(col.key, e)}
                      onMouseEnter={(e) => { if (isSortable) e.currentTarget.style.background = t.navHoverBg; }}
                      onMouseLeave={(e) => { if (isSortable) e.currentTarget.style.background = t.bgSurface; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{col.header}</span>
                        {isSortable && isSorted && <span style={{ fontSize: 12, color: t.accent }}>{direction === 'asc' ? ' ↑' : ' ↓'}</span>}
                        {isSortable && !isSorted && <span style={{ fontSize: 10, color: t.placeholder }}>⇅</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dataToRender.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length}
                    style={{ padding: 30, textAlign: 'center', color: t.placeholder, background: t.bgSurface }}>
                    {loading ? 'Загрузка…' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                dataToRender.map((row) => {
                  const isSelected = selectedRowKey !== undefined && row[rowKey] === selectedRowKey;
                  return (
                    <tr key={row[rowKey]}
                      className={rowClassName ? rowClassName(row) : ''}
                      onClick={() => onRowClick && onRowClick(row)}
                      style={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        background: isSelected ? `${t.accent}22` : t.bgSurface,
                        borderLeft: isSelected ? `3px solid ${t.accent}` : 'none',
                        transition: 'background 0.15s',
                        ...(rowStyle ? rowStyle(row) : null),
                      }}
                      onMouseEnter={(e) => { if (onRowClick && !isSelected) e.currentTarget.style.background = t.navHoverBg; }}
                      onMouseLeave={(e) => { if (onRowClick && !isSelected) e.currentTarget.style.background = t.bgSurface; }}
                    >
                      {displayColumns.map((col) => (
                        <td key={col.key} style={{ ...cellBaseStyle, ...getStickyStyle(col.key), ...col.style }}>
                          {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!settingsOpen && gearPos && typeof document !== 'undefined' && createPortal(
        <button type="button" className="kbs-table-gear" onClick={openSettings}
          aria-label="Настройка таблицы" title="Настройка таблицы"
          style={{
            position: 'fixed', top: gearPos.top, left: gearPos.left, zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%', background: t.bgSurface,
            border: `1px solid ${t.border}`, color: t.iconColor, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 0, fontSize: 18, lineHeight: 1,
            '--kbs-gear-hover': t.navHoverBg, '--kbs-gear-text': t.text, '--kbs-gear-accent': t.accent,
          } as React.CSSProperties}>
          ⚙
        </button>,
        document.body,
      )}

      <Modal theme={t} isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onOk={applySettings}
        title="Настройка таблицы" columns={1} rows={1} okText="Применить" cancelText="Отмена"
        canSubmit fields={[settingsField]} />
    </>
  );
}