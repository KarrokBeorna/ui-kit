import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface UseFetchOptions<T> {
  /**
   * Дебаунс изменения url/params, мс. Первый запрос — сразу, без задержки.
   * @default 0 (без дебаунса — поведение как раньше)
   */
  debounceMs?: number;

  /** Начальное значение data (пока идёт первый запрос). */
  initialData?: T | null;

  /**
   * Не делать автоматический запрос. Только через `refetch()`.
   * @default false
   */
  skip?: boolean;

  /**
   * Преобразование ответа перед сохранением в data.
   * Identity не перезапрашивает — читается через ref.
   */
  select?: (raw: T) => T;

  /**
   * Сбрасывать data в `initialData` (или null), когда `url` становится null.
   * @default false — старые данные сохраняются (плавный UX без мигания).
   */
  resetOnNull?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Принудительный запрос. Не дебаунсится. Отменяет текущий in-flight запрос. */
  refetch: () => Promise<void>;
}

/**
 * Детерминированная сериализация params для сравнения.
 * - URLSearchParams — toString() (порядок уже определён вызывающим).
 * - Объект — сортировка ключей + разворот массивов, чтобы `{a:1,b:2}` и
 *   `{b:2,a:1}` дали одинаковый ключ и не спровоцировали лишний запрос.
 */
function serializeParams(params?: Record<string, any> | URLSearchParams | null): string {
  if (!params) return '';
  if (params instanceof URLSearchParams) return params.toString();
  const keys = Object.keys(params).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = params[k];
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null) continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
      }
    } else if (v !== null) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.join('&');
}

function isAbortError(e: unknown): boolean {
  if (axios.isCancel(e)) return true;
  if (!e || typeof e !== 'object') return false;
  const anyE = e as any;
  return (
    anyE.code === 'ERR_CANCELED' ||
    anyE.name === 'AbortError' ||
    anyE.name === 'CanceledError'
  );
}

/**
 * Обёртка над GET-запросом с защитой от гонок, отменой in-flight запросов,
 * дебаунсом изменений и состоянием загрузки/ошибки.
 *
 * @param url    относительный URL; null — не запрашивать
 * @param params query-параметры. Объект — обычный axios-params,
 *               URLSearchParams — передаётся как есть.
 * @param options debounceMs / initialData / skip / select / resetOnNull
 */
export function useFetch<T = any>(
  url: string | null,
  params?: Record<string, any> | URLSearchParams,
  options: UseFetchOptions<T> = {},
): UseFetchResult<T> {
  const {
    debounceMs = 0,
    initialData,
    skip = false,
    select,
    resetOnNull = false,
  } = options;

  const [data, setData] = useState<T | null>(() =>
    initialData !== undefined ? initialData : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Свежие значения без пересоздания fetchData
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const selectRef = useRef(select);
  selectRef.current = select;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  const paramsKey = serializeParams(params);
  const urlKey = url ?? '';

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!urlKey) return;

      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<T>(urlKey, {
          params: paramsRef.current,
          signal,
        });
        if (reqId !== reqIdRef.current) return;
        const transformed = selectRef.current ? selectRef.current(res.data) : res.data;
        setData(transformed);
      } catch (e) {
        if (isAbortError(e)) return;
        if (reqId === reqIdRef.current) {
          setError(axios.isAxiosError(e) ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [urlKey],
  );

  // Первый запуск — сразу, последующие — с debounce
  const firstRunRef = useRef(true);

  useEffect(() => {
    // Отменяем предыдущий in-flight запрос
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!url) {
      setLoading(false);
      setError(null);
      if (resetOnNull) {
        setData(initialDataRef.current !== undefined ? initialDataRef.current : null);
      }
      return;
    }

    if (skip) return;

    const delay = firstRunRef.current ? 0 : debounceMs;
    firstRunRef.current = false;

    const controller = new AbortController();

    const run = () => {
      abortRef.current = controller;
      void fetchData(controller.signal);
    };

    if (delay > 0) {
      const timer = window.setTimeout(run, delay);
      return () => {
        window.clearTimeout(timer);
        controller.abort();
      };
    }

    run();
    return () => controller.abort();
  }, [url, paramsKey, debounceMs, skip, resetOnNull, fetchData]);

  const refetch = useCallback(async () => {
    if (!url) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    await fetchData(controller.signal);
  }, [url, fetchData]);

  return { data, loading, error, refetch };
}