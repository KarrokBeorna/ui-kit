import { useEffect, useRef } from 'react';

const OVERLAY_SELECTORS = [
  '[data-modal="true"]',
  '[data-dropdown="true"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  'dialog[open]',
].join(',');

/** Открыт ли сейчас модал / дропдаун / любой другой оверлей. */
export function isOverlayOpen(): boolean {
  return !!document.querySelector(OVERLAY_SELECTORS);
}

interface UseAutoRefreshOptions {
  /** Интервал между обновлениями, мс. @default 30_000 */
  intervalMs?: number;
  /** Внешний флаг паузы (например, на время длинной операции). */
  paused?: boolean;
  /**
   * Случайный джиттер [0, jitterMs] к интервалу — чтобы 20 инстансов
   * не стучали на сервер синхронно.
   * @default 1000
   */
  jitterMs?: number;
}

/**
 * Периодически вызывает `refetch`, пока вкладка видима и не открыт оверлей.
 *
 * `refetch` читается через ref — смена идентичности функции (пересоздаётся
 * в `useFetch` при смене URL/params) не пересоздаёт таймер и не сбрасывает
 * фазу ожидания.
 *
 * @example
 *   useAutoRefresh(refetchScans);                              // раз в 30 с
 *   useAutoRefresh(refetchUsers, { intervalMs: 60_000 });      // раз в 60 с
 *   useAutoRefresh(refetch, { paused: isEditing });            // с паузой
 */
export function useAutoRefresh(
  refetch: () => void | Promise<void>,
  { intervalMs = 30_000, paused = false, jitterMs = 1000 }: UseAutoRefreshOptions = {},
): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (paused) return;

    const interval = intervalMs + Math.random() * jitterMs;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (isOverlayOpen()) return;
      void refetchRef.current();
    }, interval);

    return () => window.clearInterval(id);
  }, [intervalMs, paused, jitterMs]);
}