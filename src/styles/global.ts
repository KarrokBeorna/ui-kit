// global.ts — базовые стили UI Kit.
//
// ПОЧЕМУ НЕ .css: импорт `import './styles/global.css'` из index.ts вырезается
// бандлером/сборкой пакета (sideEffects:false, external CSS, lib-режим) — в проектах
// не применялись ни reset (body margin:8px → лишняя прокрутка), ни box-sizing
// (таблицы ширились на 2px边框 → скролл по X и Y), ни шрифты.
// Теперь стили инжектятся в рантайме через useStyleTag — как и все остальные
// стили библиотеки — и применяются всегда, независимо от сборки потребителя.

import { useStyleTag } from '../hooks';

export const GLOBAL_STYLE_ID = 'kbs-global-css';

export const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }

html, body, #root { height: 100%; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
html, body { overscroll-behavior-y: none; }

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd { margin: 0; }
button, input, optgroup, select, textarea {
  font-family: inherit; font-size: 100%; line-height: 1.15; margin: 0;
}

/* Скроллбары в палитре темы: переменные выставляет PageLayout на <html>. */
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
 * Инжектит базовые стили библиотеки (reset, шрифты, скроллбары, keyframes).
 * Идемпотентно по id. AppProvider / PageLayout вызывают автоматически —
 * вручную нужен только при использовании компонентов совсем без провайдера.
 */
export function useGlobalStyles(): void {
  useStyleTag(GLOBAL_STYLE_ID, GLOBAL_CSS);
}