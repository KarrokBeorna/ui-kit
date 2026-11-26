// Table.tsx - UI Kit
// Table.tsx — таблица + мобильные карточки + фабрика колонки действий.
//
// ИЗМЕНЕНИЯ (мобильные карточки):
//  • значения полей переносятся по словам и обрезаются тем же лимитом строк,
//    что и метки (заголовки столбцов) — проп labelMaxLines, по умолчанию 3;
//    длинный непрерывный текст (URL, идентификаторы) тоже переносится;
//  • настройка полей карточки: кнопка «Поля карточки» над списком открывает
//    модалку с чекбоксами, порядком (↑/↓), «Выбрать все» / «Скрыть все».
//    Можно оставить 5–10 полей для постоянного наблюдения — карточка
//    становится компактной. Набор НЕ зависит от видимости колонок десктопа
//    и сохраняется отдельно: localStorage 'table-mobile-fields:<persistKey>';
//  • счётчик «видимо/всего» на кнопке настройки.
//
// Ранее:
//  • зебра (stripe / 'odd' / 'even') + настройка в шестерёнке десктопа;
//  • действие 'photos' (onPhotos / photosIcon) — просмотр фотографий записи;
//  • шестерёнка следует за таблицей при любом сдвиге layout (watchLayout);
//  • ACL: Column.acl / MobileCardField.acl; ActionsColumn({ acl }) объявляет
//    и проверяет ресурсы; labels — имена действий для редактора ролей;
//    allow — точечное скрытие действия для конкретной строки.
import React, {
  useState, useMemo, useCallback, useRef, useLayoutEffect, Fragment, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import Modal from './Modal';
import Checkbox from './Checkbox';
import Button from './Button';
import { IcoChevronUp, IcoChevronDown, SettingsIcon } from './icons';
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

/* ───────────────────────── Персист колонок + зебры (внутренний) ───────────────────────── */

/** Режим чередования строк: 'even' — полоса на чётных, 'odd' — на нечётных, false — выключено. */
export type StripeMode = 'odd' | 'even' | false;

const STORAGE_PREFIX = 'table-columns:';
const MOBILE_STORAGE_PREFIX = 'table-mobile-fields:';
const hasStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

interface StoredColumns { order: string[]; visible: string[]; stripe?: StripeMode; }

function loadColumns(key: string): StoredColumns | null {
  if (!hasStorage) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(parsed?.order) && Array.isArray(parsed?.visible)) {
      return {
        order: Array.from(new Set<string>(parsed.order)),
        visible: Array.from(new Set<string>(parsed.visible)),
        stripe: parsed.stripe === 'odd' || parsed.stripe === 'even' || parsed.stripe === false
          ? parsed.stripe : undefined,
      };
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

function usePersistedTableColumns(
  tableKey: string, allColumnKeys: string[], pinnedKeys: string[],
  enabled: boolean, defaultStripe: StripeMode,
) {
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
  const [stripe, setStripe] = useState<StripeMode>(() => {
    if (!enabled) return defaultStripe;
    const s = loadColumns(storageKey);
    return s?.stripe ?? defaultStripe;
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

  useEffect(() => {
    if (enabled) saveColumns(storageKey, { order, visible, stripe });
  }, [storageKey, order, visible, stripe, enabled]);

  const onApplySettings = useCallback((v: string[], o: string[], st: StripeMode) => {
    setVisible(v.filter((k) => !pinnedSet.has(k)));
    setOrder(o.filter((k) => !pinnedSet.has(k)));
    setStripe(st);
  }, [pinnedSet]);

  const columnOrder = useMemo(() => [...order, ...pinned], [order, pinned]);
  const visibleColumns = useMemo(() => [...visible, ...pinned], [visible, pinned]);

  return { columnOrder, visibleColumns, stripe, onApplySettings };
}

/* ───────────────────────── Персист полей мобильной карточки ───────────────────────── */

interface StoredMobileFields { order: string[]; visible: string[]; }

function loadMobileFields(key: string): StoredMobileFields | null {
  if (!hasStorage) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(parsed?.order) && Array.isArray(parsed?.visible)) {
      return {
        order: Array.from(new Set<string>(parsed.order)),
        visible: Array.from(new Set<string>(parsed.visible)),
      };
    }
  } catch { /* ignore */ }
  return null;
}

function saveMobileFields(key: string, value: StoredMobileFields) {
  if (!hasStorage) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/**
 * Независимый от десктопа набор полей мобильной карточки.
 * Без persistKey — состояние в памяти (как у десктопной шестерёнки).
 */
function usePersistedMobileFields(tableKey: string, allKeys: string[], enabled: boolean) {
  const storageKey = MOBILE_STORAGE_PREFIX + tableKey;
  const signature = allKeys.join('\u0001');

  const [order, setOrder] = useState<string[]>(() => {
    if (!enabled) return allKeys;
    const s = loadMobileFields(storageKey);
    return s ? reconcileOrder(s.order, allKeys) : allKeys;
  });
  const [visible, setVisible] = useState<string[]>(() => {
    if (!enabled) return allKeys;
    const s = loadMobileFields(storageKey);
    if (!s) return allKeys;
    const allSet = new Set(allKeys);
    const storedOrderSet = new Set(s.order);
    const result = s.visible.filter((k) => allSet.has(k));
    for (const k of allKeys) if (!storedOrderSet.has(k) && !result.includes(k)) result.push(k);
    return result;
  });

  const prevKeysRef = useRef<string[]>(allKeys);
  const allKeysRef = useRef<string[]>(allKeys);
  allKeysRef.current = allKeys;

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

  useEffect(() => {
    if (enabled) saveMobileFields(storageKey, { order, visible });
  }, [storageKey, order, visible, enabled]);

  const apply = useCallback((v: string[], o: string[]) => {
    setVisible(v);
    setOrder(o);
  }, []);

  return { order, visible, apply };
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
  /**
   * Максимум строк метки (заголовка столбца). Значения переносятся по словам
   * и обрезаются ТЕМ ЖЕ лимитом строк. @default 3
   */
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
  loading = false, pageSize = 20, gap = 10, labelMaxWidth = 160, labelMaxLines = 3,
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

  /**
   * Метки и значения: перенос по словам (включая длинные непрерывные строки)
   * и одинаковый лимит строк — карточка не «расползается» на длинных текстах.
   */
  const clampedTextStyle: React.CSSProperties = {
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    display: '-webkit-box',
    WebkitLineClamp: labelMaxLines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
              {visibleFields.map((f) => {
                const content = f.render(row);
                return (
                  <Fragment key={f.label}>
                    <dt style={{ color: t.textMuted, ...clampedTextStyle }}>
                      {f.label}
                    </dt>
                    <dd
                      title={typeof content === 'string' ? content : undefined}
                      style={{ margin: 0, color: t.text, ...clampedTextStyle }}>
                      {content}
                    </dd>
                  </Fragment>
                );
              })}
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
  /** Применить настройки (колонки + зебра). Вызывается из модалки шестерёнки. */
  onApplySettings?: (visible: string[], order: string[], stripe?: StripeMode) => void;
  /** Включить локальную сортировку. */
  sortable?: boolean;
  /** Ключ персиста колонок в localStorage (и полей мобильной карточки — отдельным ключом). */
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
  /** Максимум строк метки и значения в карточке (значения переносятся). @default 3 */
  mobileLabelMaxLines?: number;
  mobileActions?: (row: T) => React.ReactNode;
  /** Полностью кастомный мобильный рендер (настройка полей карточки не применяется). */
  renderMobile?: (data: T[]) => React.ReactNode;
  /** Состояние загрузки. */
  loading?: boolean;
  /**
   * Чередование фона строк (зебра).
   *  • true — полоса на чётных строках (2-я, 4-я, …); то же, что 'even';
   *  • 'odd' — полоса на нечётных; 'even' — на чётных;
   *  • false — выключено.
   * Без пропа: значение из настроек пользователя (шестерёнка, сохраняется в
   * localStorage при наличии persistKey), по умолчанию включено ('even').
   * Явный фон из rowStyle/rowClassName перекрывает полосу.
   * @default true
   */
  stripe?: boolean | StripeMode;
}

const TABLE_CSS = `
.kbs-table-gear { transition: background .2s, color .2s, transform .2s; }
@media (hover: hover) { .kbs-table-gear:hover { background: var(--kbs-gear-hover) !important; color: var(--kbs-gear-text) !important; } }
.kbs-table-gear:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 2px; }
.kbs-col-move { transition: background .15s, opacity .15s; }
@media (hover: hover) { .kbs-col-move:not(:disabled):hover { background: var(--kbs-gear-hover) !important; } }
.kbs-col-move:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 1px; }
.kbs-mobile-fields-btn { transition: background .15s, border-color .15s; }
.kbs-mobile-fields-btn:focus-visible { outline: 2px solid var(--kbs-gear-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .kbs-table-gear, .kbs-col-move, .kbs-mobile-fields-btn { transition: none !important; } }
`;

const normalizeStripe = (s: boolean | StripeMode | undefined): StripeMode | undefined =>
  s === undefined ? undefined : s === false ? false : s === true ? 'even' : s;

/** Поле мобильной карточки с устойчивым id для персиста. */
interface MobileFieldEntry<T> {
  id: string;
  label: string;
  field: MobileCardField<T>;
}

/**
 * Таблица с сортировкой, настройкой колонок (шестерёнка), зеброй,
 * sticky-колонками, персистом и автоматическим мобильным режимом (карточки
 * с независимой настройкой полей).
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
  stripe,
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

  /* Персист колонок + зебры */
  const allColumnKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const effectivePinned = pinnedColumns ?? stickyRight;
  const propStripe = normalizeStripe(stripe);
  const defaultStripe: StripeMode = propStripe ?? 'even';
  const persisted = usePersistedTableColumns(
    persistKey ?? '__unused__', allColumnKeys, effectivePinned, !!persistKey, defaultStripe);

  /* Зебра: проп → персист → дефолт */
  const [internalStripe, setInternalStripe] = useState<StripeMode>(defaultStripe);
  const effectiveStripe: StripeMode =
    propStripe !== undefined ? propStripe : persistKey ? persisted.stripe : internalStripe;

  const stripeRowBg = useCallback((index: number): string => {
    if (effectiveStripe === false) return t.bgSurface;
    const rowNumber = index + 1;
    const shaded = effectiveStripe === 'odd' ? rowNumber % 2 === 1 : rowNumber % 2 === 0;
    return shaded ? t.stripeBg : t.bgSurface;
  }, [effectiveStripe, t.bgSurface, t.stripeBg]);

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

  /* Модалка настроек (десктоп) */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOrder, setSettingsOrder] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState<Set<string>>(new Set());
  const [settingsStripe, setSettingsStripe] = useState<StripeMode>('even');

  const openSettings = useCallback(() => {
    setSettingsOrder([...order]);
    setSettingsVisible(new Set(visibleKeys));
    setSettingsStripe(effectiveStripe);
    setSettingsOpen(true);
  }, [order, visibleKeys, effectiveStripe]);

  const applySettings = useCallback(() => {
    if (onApplySettings) onApplySettings(Array.from(settingsVisible), settingsOrder, settingsStripe);
    else if (persistKey) persisted.onApplySettings(Array.from(settingsVisible), settingsOrder, settingsStripe);
    else {
      updateOrder(settingsOrder);
      updateVisible(settingsVisible);
      setInternalStripe(settingsStripe);
    }
    setSettingsOpen(false);
  }, [onApplySettings, persistKey, persisted, settingsVisible, settingsOrder, settingsStripe, updateOrder, updateVisible]);

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
        {/* Зебра */}
        <div style={{ padding: '2px 0 10px', borderBottom: `1px solid ${t.borderSubtle}` }}>
          <Checkbox theme={t} size="sm" truncate label="Чередовать строки"
            checked={settingsStripe !== false}
            onChange={(v) => setSettingsStripe(v ? 'even' : false)} />
        </div>
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
  }), [settingsOrder, settingsVisible, settingsStripe, columnByKey, stickyRightSet, t,
    toggleVisible, moveColumn, getMoveButtonStyle, can]);

  /* ── Мобильные карточки: независимый набор полей + настройка ── */

  // Базовый список полей карточки: явные mobileFields (id = label) либо
  // колонки без 'actions' (id = key). ACL учитывается сразу.
  const mobileBaseFields = useMemo<MobileFieldEntry<T>[]>(() => {
    if (mobileFields) {
      return mobileFields
        .filter((f) => !f.hidden && can(f.acl))
        .map((f) => ({ id: f.label, label: f.label, field: f }));
    }
    return columns
      .filter((c) => c.key !== 'actions' && can(c.acl))
      .map((c) => {
        const label = typeof c.header === 'string' ? c.header : c.key;
        return {
          id: c.key,
          label,
          field: {
            label,
            render: (row: T) => c.render ? c.render((row as any)[c.key], row) : (row as any)[c.key],
          },
        };
      });
  }, [columns, mobileFields, can]);

  const mobileBaseById = useMemo(
    () => new Map(mobileBaseFields.map((f) => [f.id, f])),
    [mobileBaseFields]);
  const mobileFieldKeys = useMemo(() => mobileBaseFields.map((f) => f.id), [mobileBaseFields]);

  const { order: mobileOrder, visible: mobileVisible, apply: applyMobilePersist } =
    usePersistedMobileFields(persistKey ?? '__unused__', mobileFieldKeys, !!persistKey);

  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileSettingsOrder, setMobileSettingsOrder] = useState<string[]>([]);
  const [mobileSettingsVisible, setMobileSettingsVisible] = useState<Set<string>>(new Set());

  const openMobileSettings = useCallback(() => {
    setMobileSettingsOrder([...mobileOrder]);
    setMobileSettingsVisible(new Set(mobileVisible));
    setMobileSettingsOpen(true);
  }, [mobileOrder, mobileVisible]);

  const applyMobileSettings = useCallback(() => {
    const known = new Set(mobileFieldKeys);
    applyMobilePersist(
      Array.from(mobileSettingsVisible).filter((id) => known.has(id)),
      mobileSettingsOrder.filter((id) => known.has(id)),
    );
    setMobileSettingsOpen(false);
  }, [applyMobilePersist, mobileFieldKeys, mobileSettingsVisible, mobileSettingsOrder]);

  const toggleMobileField = useCallback((id: string) => {
    setMobileSettingsVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const moveMobileField = useCallback((id: string, dir: -1 | 1) => {
    setMobileSettingsOrder((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[target], next[idx]] = [next[idx], next[target]];
      return next;
    });
  }, []);

  const setAllMobileFields = useCallback((on: boolean) => {
    setMobileSettingsVisible(on ? new Set(mobileFieldKeys) : new Set());
  }, [mobileFieldKeys]);

  const getMobileMoveButtonStyle = useCallback((canMove: boolean): React.CSSProperties => ({
    width: 36, height: 36, padding: 0, background: t.bgSurface,
    border: `1px solid ${t.border}`, borderRadius: 8,
    cursor: canMove ? 'pointer' : 'default',
    color: canMove ? t.iconColor : t.placeholder,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, opacity: canMove ? 1 : 0.35, flexShrink: 0,
    touchAction: 'manipulation',
  }), [t.bgSurface, t.border, t.iconColor, t.placeholder]);

  const mobileSettingsField = useMemo(() => ({
    row: 0, col: 0,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'min(62vh, 500px)', minHeight: 0 }}>
        <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
          Отметьте поля, которые видны в карточке. Оставьте 5–10 для компактного
          просмотра — остальные данные останутся в таблице на десктопе.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button theme={t} size="sm" outline onClick={() => setAllMobileFields(true)}>Выбрать все</Button>
          <Button theme={t} size="sm" outline onClick={() => setAllMobileFields(false)}>Скрыть все</Button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: t.textMuted, whiteSpace: 'nowrap' }}>
            Выбрано <strong style={{ color: t.text }}>{mobileSettingsVisible.size}</strong> из {mobileSettingsOrder.length}
          </span>
        </div>
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
          border: `1px solid ${t.border}`, borderRadius: 10, padding: '2px 10px', background: t.bg,
        }}>
          {mobileSettingsOrder.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: t.placeholder }}>Нет доступных полей</div>
          ) : mobileSettingsOrder.map((id, index) => {
            const entry = mobileBaseById.get(id);
            if (!entry) return null;
            const canUp = index > 0;
            const canDown = index < mobileSettingsOrder.length - 1;
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
                borderBottom: index === mobileSettingsOrder.length - 1 ? 'none' : `1px solid ${t.borderSubtle}`,
              }}>
                <Checkbox theme={t} size="sm" truncate label={entry.label}
                  checked={mobileSettingsVisible.has(id)}
                  onChange={() => toggleMobileField(id)} style={{ flex: 1, minWidth: 0 }} />
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button type="button" className="kbs-col-move" aria-label={`Переместить «${entry.label}» вверх`}
                    disabled={!canUp} onClick={() => moveMobileField(id, -1)} style={getMobileMoveButtonStyle(canUp)}>
                    <IcoChevronUp s={14} />
                  </button>
                  <button type="button" className="kbs-col-move" aria-label={`Переместить «${entry.label}» вниз`}
                    disabled={!canDown} onClick={() => moveMobileField(id, 1)} style={getMobileMoveButtonStyle(canDown)}>
                    <IcoChevronDown s={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {mobileSettingsVisible.size === 0 && (
          <div style={{ fontSize: 12, color: t.danger, flexShrink: 0 }}>
            Оставьте хотя бы одно поле, иначе карточка будет пустой.
          </div>
        )}
      </div>
    ),
  }), [mobileSettingsOrder, mobileSettingsVisible, mobileBaseById, t,
    setAllMobileFields, toggleMobileField, moveMobileField, getMobileMoveButtonStyle]);

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

  /**
   * Фон липкой ячейки должен совпадать с фоном строки (зебра/выделение),
   * иначе при горизонтальном скролле под ней «просвечивает» контент.
   */
  const getStickyStyle = useCallback((key: string, isHeader = false, rowBg = t.bgSurface): React.CSSProperties => {
    if (!stickyRightSet.has(key)) return {};
    return {
      position: 'sticky', right: 0, zIndex: isHeader ? 5 : 3,
      background: rowBg,
      boxShadow: key === firstStickyKey ? `inset 2px 0 ${t.border}` : 'none',
    };
  }, [stickyRightSet, firstStickyKey, t.bgSurface, t.border]);

  const cellBaseStyle: React.CSSProperties = {
    padding: '10px 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: columnMaxWidth, borderRight: `1px solid ${t.borderSubtle}`,
    color: t.text, textAlign: 'left',
    // Фон ячейки прозрачный: раскрашивается сама строка (зебра/ховер/выделение).
  };
  const headerCellStyle: React.CSSProperties = {
    ...cellBaseStyle, fontWeight: 600, cursor: 'default', transition: 'background 0.15s',
    position: 'sticky', top: 0, zIndex: 3, background: t.bgSurface,
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

    // Поля карточки — независимый набор (порядок + видимость), не связанный
    // с видимостью колонок десктопной таблицы.
    const mobileVisibleSet = new Set(mobileVisible);
    const fields: MobileCardField<T>[] = mobileOrder
      .filter((id) => mobileVisibleSet.has(id))
      .map((id) => mobileBaseById.get(id))
      .filter((e): e is MobileFieldEntry<T> => e !== undefined)
      .map((e) => e.field);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mobileBaseFields.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="kbs-mobile-fields-btn" onClick={openMobileSettings}
              aria-label="Настройка полей карточки" title="Настройка полей карточки"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                minHeight: 40, padding: '8px 12px', borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.bgSurface,
                color: t.text, fontSize: 12.5, fontFamily: 'system-ui', fontWeight: 500,
                cursor: 'pointer', touchAction: 'manipulation', boxShadow: t.shadow,
                '--kbs-gear-accent': t.accent,
              } as React.CSSProperties}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                e.currentTarget.style.background = t.navHoverBg;
                e.currentTarget.style.borderColor = t.accent;
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== 'mouse') return;
                e.currentTarget.style.background = t.bgSurface;
                e.currentTarget.style.borderColor = t.border;
              }}>
              <span style={{ color: t.iconColor, display: 'flex' }}><SettingsIcon s={14} /></span>
              Поля карточки
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 20, height: 20, padding: '0 6px', borderRadius: 20,
                background: t.navHoverBg, color: t.accent, fontSize: 11, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fields.length}/{mobileBaseFields.length}
              </span>
            </button>
          </div>
        )}
        <MobileCardList t={t} data={dataToRender} rowKey={rowKey as keyof T} fields={fields}
          titleRender={mobileTitleRender} titleMaxLines={mobileTitleMaxLines} titleMaxChars={mobileTitleMaxChars}
          labelMaxWidth={mobileLabelMaxWidth} labelMaxLines={mobileLabelMaxLines}
          onRowClick={onRowClick} actions={mobileActions ?? autoActions}
          rowStyle={rowStyle} rowClassName={rowClassName} loading={loading}
          autoRefreshInterval={autoRefreshInterval} autoRefreshPaused={autoRefreshPaused} refetch={refetch} />
        <Modal theme={t} isOpen={mobileSettingsOpen} onClose={() => setMobileSettingsOpen(false)}
          onOk={applyMobileSettings} title="Поля карточки" columns={1} rows={1}
          okText="Применить" cancelText="Отмена" width={520}
          canSubmit={mobileSettingsVisible.size > 0} fields={[mobileSettingsField]} />
      </div>
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
                dataToRender.map((row, index) => {
                  const isSelected = selectedRowKey !== undefined && row[rowKey] === selectedRowKey;
                  const baseBg = stripeRowBg(index);
                  const rowBg = isSelected
                    ? `color-mix(in srgb, ${t.accent} 14%, ${baseBg})`
                    : baseBg;
                  return (
                    <tr key={row[rowKey]}
                      className={rowClassName ? rowClassName(row) : ''}
                      onClick={() => onRowClick && onRowClick(row)}
                      style={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        background: rowBg,
                        borderLeft: isSelected ? `3px solid ${t.accent}` : 'none',
                        transition: 'background 0.15s',
                        ...(rowStyle ? rowStyle(row) : null),
                      }}
                      onMouseEnter={(e) => { if (onRowClick && !isSelected) e.currentTarget.style.background = t.navHoverBg; }}
                      onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = rowBg; }}
                    >
                      {displayColumns.map((col) => (
                        <td key={col.key} style={{ ...cellBaseStyle, ...getStickyStyle(col.key, false, rowBg), ...col.style }}>
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