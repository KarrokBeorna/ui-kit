import { useEffect, useState } from 'react';

/**
 * Возвращает значение, которое «успокаивается» через delayMs после
 * последнего изменения. Используется для дебаунса query-параметров.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}