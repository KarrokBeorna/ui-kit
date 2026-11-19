// hooks.ts — публичные хуки общего назначения + внутренние утилиты библиотеки.
//
// ИЗМЕНЕНИЯ:
//  • FetchClientContext — HTTP-клиент модуля (createAppModule → AppProvider)
//    теперь используется и useFetch. Раньше useFetch ходил через глобальный axios,
//    игнорируя axiosInstance модуля (моки/interceptors/baseURL не применялись).
//  • useFetch: опция client для явного переопределения клиента.
//  • useModalForm: форма больше не сбрасывается на каждом рендере в режиме
//    редактирования (initialData сравнивается по содержимому, а не по ссылке).
//  • watchLayout — единый наблюдатель «элемент поехал/изменился размер»
//    (ResizeObserver по элементу и всем предкам + scroll/resize/visualViewport/
//    transitionend). Чинит «залипание» плавающих якорей при раскрытии FilterBar.

import {
  createContext, useCallback, useContext, useEffect, useInsertionEffect, useLayoutEffect,
  useRef, useState, type RefObject,
} from 'react';
import axios, { type AxiosInstance } from 'axios';

/* ───────────────────────── HTTP-клиент ───────────────────────── */

/**
 * Клиент axios, заданный провайдером приложения (createAppModule → AppProvider).
 * null → глобальный axios. Позволяет useFetch работать тем же клиентом, что и auth.
 */
export const FetchClientContext = createContext<AxiosInstance | null>(null);

/* ───────────────────────── Инъекция стилей ───────────────────────── */

/** Идемпотентно инжектит <style id> в <head> (без отдельных CSS-файлов). */
export function useStyleTag(id: string, css: string): void {
  useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id; el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** useLayoutEffect на клиенте, useEffect на сервере (без SSR-warning). */
export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ───────────────────────── Наблюдатель геометрии ───────────────────────── */

/**
 * Вызывает cb, когда элемент изменил размер ИЛИ позицию: ResizeObserver на
 * элементе и всех его предках (рост соседнего блока сдвигает элемент без
 * изменения его собственного размера), scroll (capture), resize, visualViewport,
 * а также завершение CSS-переходов/анимаций. Возвращает функцию отписки.
 */
export function watchLayout(el: HTMLElement, cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => cb()) : null;
  if (ro) { let p: HTMLElement | null = el; while (p) { ro.observe(p); p = p.parentElement; } }
  const onScroll = () => cb();
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', cb);
  const vv = window.visualViewport;
  vv?.addEventListener('resize', cb);
  vv?.addEventListener('scroll', cb);
  document.addEventListener('transitionend', onScroll, true);
  document.addEventListener('animationend', onScroll, true);
  return () => {
    ro?.disconnect();
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', cb);
    vv?.removeEventListener('resize', cb);
    vv?.removeEventListener('scroll', cb);
    document.removeEventListener('transitionend', onScroll, true);
    document.removeEventListener('animationend', onScroll, true);
  };
}

/* ───────────────────────── Scroll lock ───────────────────────── */

/** Блокирует прокрутку body, пока active === true; восстанавливает overflow. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/* ───────────────────────── Оверлеи / авто-refresh ───────────────────────── */

const OVERLAY_SELECTORS = '[data-modal="true"],[data-dropdown="true"],[role="dialog"],[aria-modal="true"],dialog[open]';

/** Открыт ли сейчас модал / дропдаун / любой другой оверлей. */
export function isOverlayOpen(): boolean {
  return typeof document !== 'undefined' && !!document.querySelector(OVERLAY_SELECTORS);
}

export interface UseAutoRefreshOptions {
  /** Интервал между обновлениями, мс. @default 30_000 */
  intervalMs?: number;
  /** Внешняя пауза (например, на время редактирования). */
  paused?: boolean;
  /** Случайный джиттер [0, jitterMs] — против синхронных залпов. @default 1000 */
  jitterMs?: number;
}

/** Периодически вызывает refetch, пока вкладка видима и нет оверлеев. */
export function useAutoRefresh(
  refetch: () => void | Promise<void>,
  { intervalMs = 30_000, paused = false, jitterMs = 1000 }: UseAutoRefreshOptions = {},
): void {
  const ref = useRef(refetch);
  ref.current = refetch;
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      if (document.hidden || isOverlayOpen()) return;
      void ref.current();
    }, intervalMs + Math.random() * jitterMs);
    return () => window.clearInterval(id);
  }, [intervalMs, paused, jitterMs]);
}

/* ───────────────────────── Автофокус ───────────────────────── */

export interface UseAutofocusOptions {
  /** Интервал попыток вернуть фокус, мс. @default 5000 */
  intervalMs?: number;
  /** Не перехватывать фокус, пока пользователь печатает в другом поле. @default true */
  skipWhenEditing?: boolean;
  /** Внешняя пауза. */
  paused?: boolean;
}

/** Возвращает фокус на input, если нет оверлеев/контекстного меню и (опц.) никто не печатает. */
export function useAutofocus(
  inputRef: RefObject<HTMLInputElement | null>,
  { intervalMs = 5000, skipWhenEditing = true, paused = false }: UseAutofocusOptions = {},
): void {
  useEffect(() => {
    if (paused) return;
    let contextMenuOpen = false;
    const onCtx = () => { contextMenuOpen = true; };
    const reset = () => { contextMenuOpen = false; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') contextMenuOpen = false; };
    window.addEventListener('contextmenu', onCtx);
    window.addEventListener('mousedown', reset);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', reset, true);
    const id = window.setInterval(() => {
      const input = inputRef.current;
      if (contextMenuOpen || isOverlayOpen() || !input || input.disabled || input.readOnly) return;
      if (document.activeElement === input) return;
      if (skipWhenEditing) {
        const a = document.activeElement as HTMLElement | null;
        const tag = a?.tagName?.toLowerCase();
        if (a && a !== document.body && (tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable)) return;
      }
      input.focus();
    }, intervalMs);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('mousedown', reset);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', reset, true);
    };
  }, [inputRef, intervalMs, skipWhenEditing, paused]);
}

/* ───────────────────────── Дебаунс значения ───────────────────────── */

/** Значение, «успокаивающееся» через delayMs. Для запросов — useFetch({ debounceMs }). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (delayMs <= 0) { setDebounced(value); return; }
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/* ───────────────────────── Размер элемента ───────────────────────── */

/** Отслеживает размер DOM-элемента (SSR-safe). До первого измерения — { 0, 0 }. */
export function useResizeObserver<T extends HTMLElement>(
  ref: RefObject<T | null>, debounceMs = 100,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setSize((p) => (p.width === width && p.height === height ? p : { width, height }));
      }, debounceMs);
    });
    ro.observe(node);
    const r = node.getBoundingClientRect();
    setSize({ width: r.width, height: r.height });
    return () => { if (timer) clearTimeout(timer); ro.disconnect(); };
  }, [ref, debounceMs]);
  return size;
}

/* ───────────────────────── Форма в модалке ───────────────────────── */

/**
 * Состояние формы внутри модалки: сброс при открытии и при смене содержимого
 * initialData, isDirty, reset. Ссылочная нестабильность initialData (inline-объект
 * на каждом рендере) больше НЕ сбрасывает введённые пользователем данные.
 *
 * @param isOpen      флаг открытия
 * @param initialData данные редактируемой записи (null — создание)
 * @param defaults    значения по умолчанию для новой записи
 */
export function useModalForm<T extends Record<string, any>>(
  isOpen: boolean, initialData: Partial<T> | null, defaults: T,
) {
  const defaultsRef = useRef(defaults); defaultsRef.current = defaults;
  const initialRef = useRef(initialData); initialRef.current = initialData;

  const build = useCallback((): T => {
    const base = defaultsRef.current;
    const src = initialRef.current;
    const out: Record<string, any> = { ...base };
    if (src) for (const k of Object.keys(base)) if (k in src) out[k] = (src as any)[k];
    return out as T;
  }, []);

  const [form, setForm] = useState<T>(build);
  const [snapshot, setSnapshot] = useState<T>(build);
  const initialKey = JSON.stringify(initialData ?? null);

  useEffect(() => {
    if (!isOpen) return;
    const next = build();
    setForm(next); setSnapshot(next);
  }, [isOpen, initialKey, build]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);
  const reset = useCallback(() => { const next = build(); setForm(next); setSnapshot(next); }, [build]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(snapshot);
  return { form, setForm, setField, reset, isDirty };
}

/* ───────────────────────── GET-запросы ───────────────────────── */

export interface UseFetchOptions<T> {
  /** Дебаунс изменения url/params, мс. Первый запрос — сразу. @default 0 */
  debounceMs?: number;
  /** Начальное значение data до первого ответа. */
  initialData?: T | null;
  /** Не делать автоматический запрос — только через refetch(). */
  skip?: boolean;
  /** Преобразование ответа. Identity не перезапрашивает — читается через ref. */
  select?: (raw: T) => T;
  /** Сбрасывать data при url === null. @default false */
  resetOnNull?: boolean;
  /** Явный axios-клиент. По умолчанию — клиент модуля (AppProvider) или глобальный axios. */
  client?: AxiosInstance;
}

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Принудительный запрос без дебаунса; отменяет текущий in-flight. */
  refetch: () => Promise<void>;
}

function serializeParams(params?: Record<string, any> | URLSearchParams | null): string {
  if (!params) return '';
  if (params instanceof URLSearchParams) return params.toString();
  const parts: string[] = [];
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    for (const item of Array.isArray(v) ? v : [v]) {
      if (item === undefined || item === null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.join('&');
}

function isAbortError(e: unknown): boolean {
  if (axios.isCancel(e)) return true;
  const a = e as any;
  return !!a && (a.code === 'ERR_CANCELED' || a.name === 'AbortError' || a.name === 'CanceledError');
}

/**
 * GET-запрос с защитой от гонок, отменой in-flight, дебаунсом и состоянием загрузки.
 * Клиент: options.client → FetchClientContext (задаётся createAppModule) → axios.
 *
 * @param url    относительный URL; null — не запрашивать
 * @param params query-параметры (объект или URLSearchParams)
 */
export function useFetch<T = any>(
  url: string | null,
  params?: Record<string, any> | URLSearchParams,
  options: UseFetchOptions<T> = {},
): UseFetchResult<T> {
  const { debounceMs = 0, initialData, skip = false, select, resetOnNull = false, client } = options;
  const ctxClient = useContext(FetchClientContext);
  const http = client ?? ctxClient ?? axios;

  const [data, setData] = useState<T | null>(initialData !== undefined ? initialData : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const paramsRef = useRef(params); paramsRef.current = params;
  const selectRef = useRef(select); selectRef.current = select;
  const initialRef = useRef(initialData); initialRef.current = initialData;
  const paramsKey = serializeParams(params);
  const urlKey = url ?? '';

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!urlKey) return;
    const reqId = ++reqIdRef.current;
    setLoading(true); setError(null);
    try {
      const res = await http.get<T>(urlKey, { params: paramsRef.current, signal });
      if (reqId !== reqIdRef.current) return;
      setData(selectRef.current ? selectRef.current(res.data) : res.data);
    } catch (e) {
      if (isAbortError(e) || reqId !== reqIdRef.current) return;
      setError(axios.isAxiosError(e) ? e.message : 'Ошибка загрузки');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [urlKey, http]);

  const firstRun = useRef(true);
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (!url) {
      setLoading(false); setError(null);
      if (resetOnNull) setData(initialRef.current !== undefined ? initialRef.current : null);
      return;
    }
    if (skip) return;
    const delay = firstRun.current ? 0 : debounceMs;
    firstRun.current = false;
    const controller = new AbortController();
    const run = () => { abortRef.current = controller; void fetchData(controller.signal); };
    if (delay > 0) {
      const timer = window.setTimeout(run, delay);
      return () => { window.clearTimeout(timer); controller.abort(); };
    }
    run();
    return () => controller.abort();
  }, [url, paramsKey, debounceMs, skip, resetOnNull, fetchData]);

  const refetch = useCallback(async () => {
    if (!url) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    await fetchData(controller.signal);
  }, [url, fetchData]);

  return { data, loading, error, refetch };
}