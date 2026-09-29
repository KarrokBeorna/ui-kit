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
  /** Интервал между обновлениями, мс. По умолчанию 30 000. */
  intervalMs?: number;
  /** Внешний флаг паузы (например, на время длинной операции). */
  paused?: boolean;
}

/**
 * Периодически вызывает refetch, пока вкладка видима и не открыт
 * оверлей. Сам refetch через ref — чтобы смена идентичности функции
 * (пересоздаётся в useFetch при смене URL/params) не пересоздавала
 * таймер и не сбрасывала фазу ожидания.
 *
 * @example
 *   useAutoRefresh(refetchScans);            // раз в 30 с
 *   useAutoRefresh(refetchUsers, { intervalMs: 60_000 });
 *   useAutoRefresh(refetch, { paused: isEditing });
 */
export function useAutoRefresh(
  refetch: () => void | Promise<void>,
  { intervalMs = 30_000, paused = false }: UseAutoRefreshOptions = {},
): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (paused) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (isOverlayOpen()) return;
      void refetchRef.current();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, paused]);
}