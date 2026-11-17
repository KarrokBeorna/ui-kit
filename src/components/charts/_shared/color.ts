const CSS_FN_COLOR = /^(rgb|rgba|hsl|hsla)\(/i;

/**
 * Быстрый строковый хеш (FNV-1a). Работает для любых Unicode-строк:
 * кириллицы, эмодзи, иероглифов.
 */
export function stringHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Стабильный CSS-цвет по id/имени.
 * - '#...'                    → как есть;
 * - 'rgb(...)', 'hsl(...)'     → как есть;
 * - число                     → HSL по золотому сечению;
 * - строка                    → хеш → HSL (кириллица, эмодзи, Unicode).
 *
 * Раньше `parseInt(id, 36)` для 'Производство' возвращал NaN,
 * и браузер молча рисовал чёрный/прозрачный.
 */
export function getColorById(id: string | number): string {
  if (typeof id === 'string') {
    const t = id.trim();
    if (t.startsWith('#')) return t;
    if (CSS_FN_COLOR.test(t)) return t;
  }

  let seed: number;
  if (typeof id === 'number') {
    seed = id;
  } else {
    const asNum = Number(id);
    seed = id.trim() !== '' && !isNaN(asNum) ? asNum : stringHash(id);
  }

  const phi = 0.618033988749895;
  const frac = (((seed * phi) % 1) + 1) % 1;
  const hue = Math.round(frac * 360);
  return `hsl(${hue}, 65%, 55%)`;
}