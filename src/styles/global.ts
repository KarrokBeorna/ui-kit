// global.ts — базовые стили UI Kit.
//
// Инжектятся в рантайме через useStyleTag (CSS-импорт из index.ts вырезается
// бандлером при sideEffects:false / lib-режиме), поэтому применяются всегда.
//
// ВАЖНО: reset намеренно минимальный — только box-sizing, обнуление полей,
// шрифт и сглаживание. Никаких body { font-size / line-height }: они наследуются
// всеми компонентами и меняют метрики (футер вырастал на 2.1px). Типографика
// задаётся самими компонентами.

import { colorScheme, type Theme } from '../themes/theme';
import { useIsoLayoutEffect, useStyleTag } from '../hooks';

export const GLOBAL_STYLE_ID = 'kbs-global-css';

export const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }

html, body, #root { height: 100%; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
html, body { overscroll-behavior-y: none; }

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd { margin: 0; }
button, input, optgroup, select, textarea { font-family: inherit; margin: 0; }

/* Скроллбары в палитре темы: переменные выставляет useGlobalStyles(theme). */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--kbs-sb-thumb, rgba(127,127,127,.45)) var(--kbs-sb-track, transparent);
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: var(--kbs-sb-track, transparent); }
*::-webkit-scrollbar-thumb {
  background: var(--kbs-sb-thumb, rgba(127,127,127,.45));
  border-radius: 8px; border: 2px solid transparent; background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: var(--kbs-sb-accent, rgba(127,127,127,.75)); background-clip: padding-box;
}
*::-webkit-scrollbar-corner { background: transparent; }

@keyframes dropDown {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  /* iOS Safari зумит страницу при фокусе, если шрифт поля < 16px */
  input, textarea, select { font-size: 16px !important; }
  button { -webkit-tap-highlight-color: transparent; }
  *::-webkit-scrollbar { width: 4px; height: 4px; }
}
`;

/**
 * Инжектит базовые стили библиотеки (reset, шрифт, скроллбары, keyframes).
 * Идемпотентно по id; AppProvider вызывает автоматически.
 *
 * @param theme если передана — дополнительно выставляет на <html> переменные
 *              скроллбаров и color-scheme. Нужно на страницах без PageLayout
 *              (например, полноэкранная схема), чтобы порталы и нативные
 *              контролы тоже были в палитре темы.
 */
export function useGlobalStyles(theme?: Theme): void {
  useStyleTag(GLOBAL_STYLE_ID, GLOBAL_CSS);
  useIsoLayoutEffect(() => {
    if (!theme || typeof document === 'undefined') return;
    const r = document.documentElement;
    r.style.setProperty('--kbs-sb-thumb', theme.scrollbarThumb);
    r.style.setProperty('--kbs-sb-track', 'transparent');
    r.style.setProperty('--kbs-sb-accent', theme.accent);
    r.style.setProperty('color-scheme', colorScheme(theme.bg));
  }, [theme]);
}