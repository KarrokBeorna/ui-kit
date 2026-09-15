import { useState, useLayoutEffect, RefObject } from 'react';

export interface UseDropdownPositionOptions {
  /**
   * Ref на сам дропдаун. Нужен, чтобы измерять его реальную высоту
   * и разворачивать вверх, если снизу мало места.
   */
  dropdownRef?: RefObject<HTMLElement | null>;
  /** Отступ между инпутом и дропдауном, px. @default 4 */
  offset?: number;
  /** Минимальный отступ от краёв окна, px. @default 8 */
  margin?: number;
  /** Резервная высота, если дропдаун ещё не отрисован. @default 240 */
  fallbackHeight?: number;
}

/**
 * Возвращает стили для dropdown'а с авто-позиционированием.
 *
 * Умеет:
 *  - ставить дропдаун под инпутом;
 *  - если снизу мало места — разворачивать над инпутом;
 *  - ограничивать maxHeight по доступному пространству;
 *  - скруглять углы со стороны инпута.
 */
export function useDropdownPosition(
  open: boolean,
  inputRef: RefObject<HTMLElement | null>,
  options: UseDropdownPositionOptions = {}
): React.CSSProperties {
  const { dropdownRef, offset = 4, margin = 8, fallbackHeight = 240 } = options;

  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    width: 0,
    zIndex: 9999,
    visibility: 'hidden',
  });

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;

    const updatePosition = () => {
      const input = inputRef.current;
      if (!input) return;

      const rect = input.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;

      const measuredHeight = dropdownRef?.current?.offsetHeight ?? 0;
      const dropdownHeight = measuredHeight || fallbackHeight;

      const spaceBelow = viewportH - rect.bottom - margin - offset;
      const spaceAbove = rect.top - margin - offset;

      // Если снизу не хватает высоты и сверху больше места — переворачиваем
      const placeAbove =
        spaceBelow < Math.min(dropdownHeight, 200) && spaceAbove > spaceBelow;

      const availableSpace = placeAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(120, availableSpace);

      const top = placeAbove
        ? Math.max(margin, rect.top - offset - Math.min(dropdownHeight, maxHeight))
        : rect.bottom + offset;

      const left = Math.max(
        margin,
        Math.min(rect.left, viewportW - rect.width - margin)
      );
      const width = Math.min(rect.width, viewportW - margin * 2);

      setStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight,
        overflowY: 'auto',
        zIndex: 9999,
        visibility: 'visible',
        borderRadius: placeAbove ? '10px 10px 0 0' : '0 0 10px 10px',
      });
    };

    // Первый проход — сразу после commit
    updatePosition();
    // Второй — после того, как дропдаун отрисуется (для измерения высоты)
    const raf = requestAnimationFrame(updatePosition);

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const ro = new ResizeObserver(updatePosition);
    if (inputRef.current) ro.observe(inputRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      ro.disconnect();
    };
  }, [open, inputRef, dropdownRef, offset, margin, fallbackHeight]);

  return style;
}