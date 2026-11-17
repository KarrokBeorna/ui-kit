import { useState, useLayoutEffect, RefObject } from 'react';

export interface UseDropdownPositionOptions {
  dropdownRef?: RefObject<HTMLElement | null>;
  /** Отступ между инпутом и дропдауном, px. @default 4 */
  offset?: number;
  /** Минимальный отступ от краёв viewport, px. @default 8 */
  margin?: number;
  /** Резервная высота, если дропдаун ещё не отрисован. @default 240 */
  fallbackHeight?: number;
}

/**
 * Позиционирует дропдаун относительно инпута.
 * Учитывает visualViewport (мобильная клавиатура / зум).
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
      const vv = window.visualViewport;
      const viewportH = vv?.height ?? window.innerHeight;
      const viewportW = vv?.width ?? window.innerWidth;
      const vvOffsetTop = vv?.offsetTop ?? 0;
      const vvOffsetLeft = vv?.offsetLeft ?? 0;

      const measuredHeight = dropdownRef?.current?.offsetHeight ?? 0;
      const dropdownHeight = measuredHeight || fallbackHeight;

      const spaceBelow =
        vvOffsetTop + viewportH - rect.bottom - margin - offset;
      const spaceAbove = rect.top - vvOffsetTop - margin - offset;

      const placeAbove =
        spaceBelow < Math.min(dropdownHeight, 200) && spaceAbove > spaceBelow;

      const availableSpace = placeAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(120, availableSpace);

      const top = placeAbove
        ? Math.max(
            vvOffsetTop + margin,
            rect.top - offset - Math.min(dropdownHeight, maxHeight)
          )
        : rect.bottom + offset;

      const left = Math.max(
        vvOffsetLeft + margin,
        Math.min(rect.left, vvOffsetLeft + viewportW - rect.width - margin)
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

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // visualViewport — важно для мобильных (клавиатура, зум, URL-bar)
    const vv = window.visualViewport;
    vv?.addEventListener('resize', handleResize);
    vv?.addEventListener('scroll', handleScroll);

    const ro = new ResizeObserver(updatePosition);
    if (inputRef.current) ro.observe(inputRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      vv?.removeEventListener('resize', handleResize);
      vv?.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [open, inputRef, dropdownRef, offset, margin, fallbackHeight]);

  return style;
}