// highlight.tsx — нормализация поиска и подсветка совпадений (подстрока / подпоследовательность).
import React, { type ReactNode } from 'react';
import type { Theme } from './themes/theme';

/** Режим поиска: 'substr' — подстрока, 'subseq' — подпоследовательность («скв» → «Скворцов»). */
export type SearchMode = 'subseq' | 'substr';

/** NFC + lowercase + ё→е — единая нормализация для поиска и подсветки. */
export function normalizeForSearch(s: string): string {
  return String(s ?? '').normalize('NFC').toLowerCase().replace(/ё/g, 'е');
}

/** Совпадает ли текст с запросом в выбранном режиме. Пустой запрос → false. */
export function matchesSearch(text: string, query: string, mode: SearchMode = 'substr'): boolean {
  const t = normalizeForSearch(text), q = normalizeForSearch(query);
  if (!t || !q) return false;
  if (mode === 'substr') return t.includes(q);
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  return qi === q.length;
}

const mark = (t: Theme): React.CSSProperties => ({
  backgroundColor: t.accentGlow, color: t.accent, borderRadius: 2, padding: '0 1px',
});

function wrap(text: string, ranges: Array<[number, number]>, t: Theme): ReactNode {
  const parts: ReactNode[] = [];
  let pos = 0, key = 0;
  for (const [s, e] of ranges) {
    if (s > pos) parts.push(text.slice(pos, s));
    parts.push(<span key={key++} style={mark(t)}>{text.slice(s, e)}</span>);
    pos = e;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

/** Подсветка совпадений в тексте. Без запроса возвращает исходную строку. @default mode 'substr' */
export function highlightText(text: string, query: string, theme: Theme, mode: SearchMode = 'substr'): ReactNode {
  if (!text || !query) return text;
  const chars = Array.from(text);
  const norm = chars.map(normalizeForSearch);
  const q = Array.from(normalizeForSearch(query));
  if (!q.length) return text;

  const ranges: Array<[number, number]> = [];
  if (mode === 'substr') {
    if (norm.join('').length !== chars.length) return text; // многокодовые символы — не подсвечиваем
    const flat = norm.join('');
    const needle = q.join('');
    let idx = 0;
    for (;;) {
      const found = flat.indexOf(needle, idx);
      if (found === -1) break;
      ranges.push([found, found + needle.length]);
      idx = found + needle.length;
    }
  } else {
    let qi = 0, start = -1;
    for (let i = 0; i < norm.length && qi < q.length; i++) {
      if (norm[i] === q[qi]) { if (start < 0) start = i; qi++; }
      else if (start >= 0) { ranges.push([start, i]); start = -1; }
    }
    if (start >= 0) ranges.push([start, norm.length]);
  }
  if (!ranges.length) return text;
  return wrap(chars.join(''), ranges, theme);
}