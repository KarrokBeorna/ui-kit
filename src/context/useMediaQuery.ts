import { useCallback, useSyncExternalStore } from 'react';

/**
 * Кэш MediaQueryList: переиспользуем один MQL-объект между компонентами
 * с одинаковым запросом. После рефакторинга ResponsiveProvider — единственный
 * потребитель (5 запросов), кэш защищает и от прямых вызовов.
 */
const mqlCache = new Map<string, MediaQueryList>();

function getMQL(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  let mql = mqlCache.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    mqlCache.set(query, mql);
  }
  return mql;
}

/**
 * Подписка на media-query.
 *
 * - SSR-safe: на сервере и при гидратации возвращает `false`.
 * - Не создаёт tearing в concurrent-режиме (`useSyncExternalStore`).
 * - Не делает «двойного setState» на mount.
 * - Переиспользует `MediaQueryList` из кэша.
 *
 * @example
 *   const isMobile = useMediaQuery('(max-width: 640px)');
 *   const canHover = useMediaQuery('(hover: hover)');
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = getMQL(query);
      if (!mql) return () => {};
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => getMQL(query)?.matches ?? false, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}