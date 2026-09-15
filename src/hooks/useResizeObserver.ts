import { useState, useEffect, RefObject } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Отслеживает размер DOM-элемента. SSR-safe.
 * Возвращает { width, height } в пикселях. До первого измерения — { 0, 0 }.
 */
export function useResizeObserver<T extends HTMLElement>(
  ref: RefObject<T | null>,
  debounceMs = 100
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }, debounceMs);
    });

    ro.observe(node);
    // Захватываем начальный размер сразу
    const rect = node.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, [ref, debounceMs]);

  return size;
}