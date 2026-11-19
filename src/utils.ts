// utils.ts — переиспользуемые утилиты: даты, query-params, чипсы фильтров,
// цвет, чтение состояния колонок таблицы, скачивание файлов + прикладной хук сессии.
// Всё, что раньше дублировалось в проектах (chips/query/highlight/date/session), живёт здесь.

import { useContext, useEffect, useRef } from 'react';
import axios, { type AxiosInstance } from 'axios';
import { FetchClientContext } from './hooks';

/* ───────────────────────── Даты и время ───────────────────────── */

/** YYYY-MM-DD в локальной зоне (без TZ-сдвига toISOString). */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO-дата → «DD.MM» (текущий год) или «DD.MM.YYYY». Пусто/мусор → исходная строка. */
export function fmtDay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return String(iso);
  return y === String(new Date().getFullYear()) ? `${d}.${m}` : `${d}.${m}.${y}`;
}

const MONTHS: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/** Метка дня для осей графиков: ISO / Date / «Wed Oct 08 2025» → «DD.MM». */
export function formatDayLabel(day: unknown): string {
  if (day instanceof Date && !isNaN(day.getTime())) return `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}`;
  const s = String(day ?? '');
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}`;
  const loc = s.match(/\b([A-Z][a-z]{2})\s+(\d{1,2})/);
  if (loc && MONTHS[loc[1]]) return `${loc[2].padStart(2, '0')}.${MONTHS[loc[1]]}`;
  return s;
}

/** Разбирает ISO, «YYYY-MM-DD HH:mm:ss», Date, timestamp. Невалидное → null. */
export function toDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') { const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
  const s = String(value).trim();
  const d = new Date(s.includes('T') || s.includes('Z') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** «DD.MM.YYYY» (ru-RU). Невалидное → ''. */
export function formatDate(value: unknown): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('ru-RU') : '';
}

/** «DD.MM.YYYY, HH:mm» (ru-RU). Невалидное → ''. */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  return d ? d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
}

/** Секунды → «3 ч 05 мин» / «12 мин». */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${m} мин`;
}

/** Число с разделителями разрядов. @default locale 'ru-RU' */
export function formatNumber(n: number, locale = 'ru-RU'): string {
  return Number(n || 0).toLocaleString(locale);
}

/** Диапазон «последние N дней + сегодня»; withTime adds T00:00 / T23:59. @default days 13 */
export function defaultDateRange(days = 13, withTime = false): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);
  return withTime
    ? { from: `${isoLocal(from)}T00:00`, to: `${isoLocal(to)}T23:59` }
    : { from: isoLocal(from), to: isoLocal(to) };
}

/** «HH:MM:SS» → «HH:MM»; пусто → null. */
export function normalizeTime(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.length > 5 && val.includes(':') ? val.slice(0, 5) : val;
}

/* ───────────────────────── Query params ───────────────────────── */

export type QueryArrayFormat = 'repeat' | 'comma' | 'bracket';

/**
 * Собирает URLSearchParams из объекта фильтров.
 * Пустые строки / null / undefined / пустые массивы пропускаются.
 * @param options.arrayFormat 'repeat' → a=1&a=2 (axios-native), 'comma' → a=1,2, 'bracket' → a[]=1&a[]=2. @default 'repeat'
 */
export function buildQueryParams(
  filters: Record<string, unknown>,
  options: { arrayFormat?: QueryArrayFormat } = {},
): URLSearchParams {
  const { arrayFormat = 'repeat' } = options;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      const items = v.filter((x) => x !== undefined && x !== null && x !== '');
      if (!items.length) continue;
      if (arrayFormat === 'comma') p.set(k, items.join(','));
      else items.forEach((x) => p.append(arrayFormat === 'bracket' ? `${k}[]` : k, String(x)));
    } else p.append(k, String(v));
  }
  return p;
}

/* ───────────────────────── Чипсы фильтров ───────────────────────── */

/** «Label: value»; пусто → ''. */
export function buildTextChip(label: string, value: string): string {
  return value ? `${label}: ${value}` : '';
}

/** «Label: A, B, C +N»; пустой массив → ''. @default maxShown 3 */
export function buildMultiChip(label: string, values: string[], maxShown = 3): string {
  if (!values?.length) return '';
  return values.length <= maxShown
    ? `${label}: ${values.join(', ')}`
    : `${label}: ${values.slice(0, maxShown).join(', ')} +${values.length - maxShown}`;
}

/** Диапазон дат: «Дата: 01.10 – 08.10» / «с 01.10» / «до 08.10». */
export function buildDateChip(from: string, to: string, label = 'Дата'): string {
  if (!from && !to) return '';
  if (from && !to) return `${label}: с ${fmtDay(from)}`;
  if (!from && to) return `${label}: до ${fmtDay(to)}`;
  const f = fmtDay(from), t = fmtDay(to);
  return f === t ? `${label}: ${f}` : `${label}: ${f} – ${t}`;
}

/** «Label: Да/Нет» для 'true' | 'false' | boolean. Иначе ''. */
export function buildBoolChip(label: string, value: string | boolean | null | undefined): string {
  if (value === true || value === 'true') return `${label}: Да`;
  if (value === false || value === 'false') return `${label}: Нет`;
  return '';
}

/** «Label: подпись опции» — для селекта со списком options. */
export function buildSelectChip(label: string, value: string, options: { value: string; label: string }[]): string {
  if (!value) return '';
  return buildTextChip(label, options.find((o) => o.value === value)?.label ?? value);
}

/** Отбрасывает пустые чипсы. */
export function buildChips(...chips: Array<string | null | undefined | false>): string[] {
  return chips.filter((c): c is string => typeof c === 'string' && c.length > 0);
}

/**
 * Считает активные фильтры.
 * @param options.arrayCount 'one' — массив = 1 фильтр, 'items' — по числу значений. @default 'one'
 */
export function countActiveFilters(
  filters: Record<string, unknown>,
  options: { arrayCount?: 'one' | 'items' } = {},
): number {
  const { arrayCount = 'one' } = options;
  let n = 0;
  for (const v of Object.values(filters)) {
    if (Array.isArray(v)) n += arrayCount === 'items' ? v.length : v.length ? 1 : 0;
    else if (v !== undefined && v !== null && String(v).trim() !== '') n += 1;
  }
  return n;
}

/* ───────────────────────── Цвет ───────────────────────── */

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Стабильная пара цветов (текст + подложка) по id — золотое сечение по кругу HSL. */
export function generateTemplateColor(id: number | string): { color: string; backgroundColor: string } {
  const seed = typeof id === 'number' ? id : hashString(id);
  const hue = Math.round(((seed * 0.618033988749895) % 1) * 360 + 360) % 360;
  return { color: `hsl(${hue}, 70%, 55%)`, backgroundColor: `hsla(${hue}, 70%, 65%, 0.25)` };
}

/* ───────────────────────── Файлы ───────────────────────── */

/** Скачивает Blob как файл (создаёт и убирает <a>, освобождает object URL). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ───────────────────────── Колонки таблицы ───────────────────────── */

/**
 * Читает сохранённые `<Table persistKey>` порядок/видимость колонок.
 * Пригодится для экспорта «только видимые столбцы». Возвращает дефолты, если ничего не сохранено.
 */
export function readTableColumns(
  persistKey: string,
  allKeys: string[],
  pinnedKeys: string[] = [],
): { order: string[]; visible: string[] } {
  const pinned = new Set(pinnedKeys);
  const base = allKeys.filter((k) => !pinned.has(k));
  let order = [...base], visible = [...base];
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`table-columns:${persistKey}`) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed?.order)) {
      const set = new Set(base);
      const stored = new Set<string>(parsed.order);
      order = parsed.order.filter((k: string) => set.has(k));
      const added = base.filter((k) => !stored.has(k));
      order.push(...added);
      if (Array.isArray(parsed?.visible)) {
        visible = parsed.visible.filter((k: string) => set.has(k));
        visible.push(...added.filter((k) => !visible.includes(k)));
      } else visible = [...order];
    }
  } catch { /* ignore */ }
  return { order: [...order, ...pinnedKeys], visible: [...visible, ...pinnedKeys] };
}

/* ───────────────────────── Трекер сессии ───────────────────────── */

export interface UseSessionTrackerOptions {
  /** Axios-клиент. По умолчанию — клиент модуля (AppProvider) или глобальный axios. */
  client?: AxiosInstance;
  /** URL открытия сессии. @default '/api/usage/session/start' */
  startUrl?: string;
  /** URL heartbeat. @default '/api/usage/session/heartbeat' */
  heartbeatUrl?: string;
  /** URL закрытия сессии. @default '/api/usage/session/end' */
  endUrl?: string;
  /** Интервал heartbeat, мс. @default 60_000 */
  heartbeatMs?: number;
  /** Сколько «молчания» перестаёт считаться активностью, мс. @default 300_000 */
  idleMs?: number;
  /** Внешнее отключение. @default true */
  enabled?: boolean;
}

/**
 * Открывает сессию, шлёт heartbeat и закрывает сессию при уходе со страницы.
 * Работает и для анонимов. Heartbeat идёт только при видимой вкладке и активности
 * за последние idleMs. Смена userKey (вход/выход) переоткрывает сессию.
 *
 * @param userKey идентификатор пользователя (null — аноним)
 * @example useSessionTracker(user?.userId ?? null)
 */
export function useSessionTracker(
  userKey: string | number | null,
  {
    client, startUrl = '/api/usage/session/start', heartbeatUrl = '/api/usage/session/heartbeat',
    endUrl = '/api/usage/session/end', heartbeatMs = 60_000, idleMs = 300_000, enabled = true,
  }: UseSessionTrackerOptions = {},
): void {
  const ctxClient = useContext(FetchClientContext);
  const http = client ?? ctxClient ?? axios;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let last = Date.now();
    const onActivity = () => { last = Date.now(); };
    const beacon = (url: string) => { try { navigator.sendBeacon?.(url); } catch { /* ignore */ } };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { last = Date.now(); return; }
      if (Date.now() - last <= idleMs) beacon(heartbeatUrl);
    };
    const onUnload = () => beacon(endUrl);

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('scroll', onActivity, true);
    window.addEventListener('touchstart', onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);

    void http.post(startUrl).catch(() => {});
    const hb = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - last > idleMs) return;
      void http.post(heartbeatUrl).catch(() => {});
    }, heartbeatMs);

    return () => {
      window.clearInterval(hb);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('scroll', onActivity, true);
      window.removeEventListener('touchstart', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [userKey, enabled, http, startUrl, heartbeatUrl, endUrl, heartbeatMs, idleMs]);
}