// charts/shared.ts — общие утилиты диаграмм (цвет по id, dismiss по тапу вне).
import { useEffect, useRef } from 'react';

const CSS_FN_COLOR = /^(rgb|rgba|hsl|hsla)\(/i;

/** Быстрый строковый хеш FNV-1a (Unicode-safe: кириллица, эмодзи, иероглифы). */
function stringHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Стабильный CSS-цвет по id/имени: '#…' и css-функции — как есть;
 * число/строка — HSL по золотому сечению (равномерное распределение оттенков).
 */
export function getColorById(id: string | number): string {
  if (typeof id === 'string') {
    const t = id.trim();
    if (t.startsWith('#')) return t;
    if (CSS_FN_COLOR.test(t)) return t;
  }
  let seed: number;
  if (typeof id === 'number') seed = id;
  else {
    const asNum = Number(id);
    seed = id.trim() !== '' && !isNaN(asNum) ? asNum : stringHash(id);
  }
  const phi = 0.618033988749895;
  const frac = (((seed * phi) % 1) + 1) % 1;
  return `hsl(${Math.round(frac * 360)}, 65%, 55%)`;
}

/**
 * Снимает выделение при клике/тапе вне интерактивных элементов.
 * Мышь — сразу на pointerdown; touch — на pointerup без скролла.
 */
export function useDismissOnOutsideTap(
  enabled: boolean,
  onDismiss: () => void,
  selector: string,
  moveThreshold = 8,
): void {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    let x0 = 0, y0 = 0, pendingTouch = false;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || target.closest(selector)) return;
      if (e.pointerType === 'mouse') { onDismissRef.current(); return; }
      x0 = e.clientX; y0 = e.clientY; pendingTouch = true;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pendingTouch) return;
      pendingTouch = false;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > moveThreshold) return;
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