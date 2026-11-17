import { useEffect, useRef, useState } from 'react';

/**
 * Возвращает значение, которое «успокаивается» через `delayMs` после
 * последнего изменения.
 *
 * ⚠️ Для сетевых запросов используйте `useFetch(..., { debounceMs })` —
 * это убирает необходимость в этом хуке на страницах.
 * Для локальной фильтрации лучше `useDeferredValue` из React 18.
 *
 * Хук остаётся как fallback для случаев, где нужен именно таймер
 * (не-React состояние, IME-композиция, imperative-логика).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  const isFirstRef = useRef(true);

  useEffect(() => {
    // Первый рендер — уже актуальное значение, не планируем пустой таймер
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    if (delayMs <= 0) {
      setDebounced(value);
      return;
    }
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Дебаунс коллбэка. Возвращает **стабильную** функцию: identity не меняется
 * между рендерами, callback читается через ref (можно передавать inline).
 *
 * Полезно для onChange-хэндлеров, где нет промежуточного «значения».
 *
 * @example
 *   const search = useDebouncedCallback((q: string) => api.search(q), 300);
 *   <input onChange={(e) => search(e.target.value)} />
 */
export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delayMs = 300,
): (...args: A) => void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const timerRef = useRef<number | null>(null);

  const stableRef = useRef((...args: A) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      cbRef.current(...args);
    }, delayMs);
  });

  // Отмена при размонтировании — чтобы не дёргать callback на unmounted-компоненте
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return stableRef.current;
}