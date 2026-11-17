import { useEffect, useRef } from 'react';

export interface UseDismissOnOutsideTapOptions {
  /** CSS-селектор интерактивных элементов. Тап по ним НЕ сбрасывает выделение. */
  selector: string;
  /** Порог движения, px. Если сдвиг больше — считаем это скроллом, не тапом. @default 8 */
  moveThreshold?: number;
}

/**
 * Снимает выделение при клике/тапе вне интерактивных элементов.
 *
 * Для мыши — срабатывает сразу на pointerdown (мгновенная реакция).
 * Для touch — ждёт pointerup и проверяет, что не было скролла
 * (иначе случайный скролл страницы при касании диаграммы сбрасывал бы выделение).
 */
export function useDismissOnOutsideTap(
  enabled: boolean,
  onDismiss: () => void,
  options: UseDismissOnOutsideTapOptions
): void {
  const { selector, moveThreshold = 8 } = options;
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let touchStartX = 0;
    let touchStartY = 0;
    let pendingTouch = false;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || target.closest(selector)) return;

      if (e.pointerType === 'mouse') {
        onDismissRef.current();
        return;
      }

      touchStartX = e.clientX;
      touchStartY = e.clientY;
      pendingTouch = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pendingTouch) return;
      pendingTouch = false;

      if (
        Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY) >
        moveThreshold
      ) {
        return;
      }
      onDismissRef.current();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled, selector, moveThreshold]);
}