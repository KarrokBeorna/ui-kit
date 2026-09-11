import { useState, useLayoutEffect, RefObject } from 'react';

export function useDropdownPosition(
  open: boolean,
  inputRef: RefObject<HTMLElement>
) {
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
      const rect = inputRef.current!.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        visibility: 'visible',
      });
    };

    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const resizeObserver = new ResizeObserver(() => updatePosition());
    resizeObserver.observe(inputRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      resizeObserver.disconnect();
    };
  }, [open, inputRef]);

  return style;
}