import { useEffect, RefObject } from 'react';
import { isOverlayOpen } from './useAutoRefresh';

interface UseAutofocusOptions {
  /** Интервал попыток вернуть фокус, мс. По умолчанию 5000. */
  intervalMs?: number;
  /** Не возвращать фокус, пока пользователь печатает в другом поле. По умолчанию true. */
  skipWhenEditing?: boolean;
  /** Внешний флаг паузы (например, на время длинной операции). */
  paused?: boolean;
}

/**
 * Периодически возвращает фокус на input, если:
 *   - не открыто модальное окно / дропдаун,
 *   - не открыто контекстное меню,
 *   - (опционально) пользователь не печатает в другом поле.
 *
 * @example
 *   useAutofocus(vinInputRef);                       // раз в 5 с, все проверки
 *   useAutofocus(scanRef, { intervalMs: 10_000 });   // раз в 10 с
 *   useAutofocus(ref, { skipWhenEditing: false });   // форсировать фокус всегда
 */
export function useAutofocus(
  inputRef: RefObject<HTMLInputElement | null>,
  { intervalMs = 5000, skipWhenEditing = true, paused = false }: UseAutofocusOptions = {},
): void {
  useEffect(() => {
    if (paused) return;

    let contextMenuOpen = false;

    const onContextMenu = () => { contextMenuOpen = true; };
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) contextMenuOpen = false; };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') contextMenuOpen = false; };
    const onScroll = () => { contextMenuOpen = false; };

    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, true);

    const shouldRefocus = (): boolean => {
      if (contextMenuOpen) return false;
      if (isOverlayOpen()) return false;

      const input = inputRef.current;
      if (!input || input.disabled || input.readOnly) return false;
      if (document.activeElement === input) return false;

      if (skipWhenEditing) {
        const active = document.activeElement as HTMLElement | null;
        if (active && active !== document.body) {
          const tag = active.tagName?.toLowerCase();
          const editable =
            tag === 'input' ||
            tag === 'textarea' ||
            tag === 'select' ||
            active.isContentEditable;
          if (editable) return false;
        }
      }
      return true;
    };

    const id = window.setInterval(() => {
      if (shouldRefocus()) inputRef.current?.focus();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [inputRef, intervalMs, skipWhenEditing, paused]);
}