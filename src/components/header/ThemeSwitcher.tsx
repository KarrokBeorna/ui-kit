import {
  memo, useCallback, useEffect, useId, useInsertionEffect, useLayoutEffect,
  useRef, useState, type CSSProperties, type KeyboardEvent,
} from 'react';
import { themes, type Theme, type ThemeName } from '../../themes/theme';
import { useResponsive } from '../../context/ResponsiveContext';

/* ────────────────────────────────────────────────────────────
   Инъекция стилей без отдельных CSS-файлов (идемпотентно по id).
   Экспортируется — переиспользуется LayoutToggle / Header / MobileHeader.
   ──────────────────────────────────────────────────────────── */
export function useStyleTag(id: string, css: string) {
  useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

export const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Контрастный текст поверх произвольного цвета пилюли. */
const readableOn = (color: string): string => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return '#ffffff';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? '#0b0f17' : '#ffffff';
};

/** Список тем выводится из реестра: новая тема не требует правки компонента. */
const PREFERRED: ThemeName[] = ['dark', 'light', 'vibrant', 'ocean'];
const THEME_OPTIONS = (() => {
  const keys = Object.keys(themes) as ThemeName[];
  const ordered = [
    ...PREFERRED.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !PREFERRED.includes(k)),
  ];
  return ordered.map((id) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    dot: themes[id].accent,
  }));
})();

const CSS = `
.kbs-seg-btn { background: transparent; color: var(--seg-muted); transition: color .25s; }
.kbs-seg-btn[aria-checked="true"] { color: var(--seg-on); font-weight: 600; }
@media (hover: hover) {
  .kbs-seg-btn:not([aria-checked="true"]):hover { color: var(--seg-text); }
  .kbs-dot-btn:hover { background: var(--seg-hover); }
  .kbs-dot-item:hover { background: var(--seg-hover); }
}
.kbs-seg-btn:focus-visible, .kbs-dot-btn:focus-visible, .kbs-dot-item:focus-visible {
  outline: 2px solid var(--seg-accent); outline-offset: 2px;
}
.kbs-dot-btn, .kbs-dot-item { transition: background .15s, transform .15s; }
@media (prefers-reduced-motion: reduce) {
  .kbs-seg-pill, .kbs-seg-btn, .kbs-seg-dot, .kbs-dot-btn, .kbs-dot-item { transition: none !important; }
}
`;

export interface ThemeSwitcherProps {
  theme: ThemeName;
  onChange: (theme: ThemeName) => void;
  t: Theme;
  compact?: boolean;
  stretch?: boolean;
  minButtonHeight?: number;
}

/* ────────────────────────────────────────────────────────────
   Сегментированный переключатель (radiogroup + стрелки)
   ──────────────────────────────────────────────────────────── */
export const ThemeSwitcher = memo(function ThemeSwitcher({
  theme, onChange, t, compact = false, stretch = false, minButtonHeight,
}: ThemeSwitcherProps) {
  useStyleTag('kbs-theme-switcher-css', CSS);
  const { isTouch, prefersReducedMotion } = useResponsive();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const found = THEME_OPTIONS.findIndex((o) => o.id === theme);
  const activeIdx = found < 0 ? 0 : found;

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!wrap || !btn) return;
    const cr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setPill({ left: br.left - cr.left, width: br.width, ready: true });
  }, [activeIdx]);

  const measureRef = useRef(measure);
  measureRef.current = measure;

  useIsoLayoutEffect(() => { measure(); }, [measure, compact, stretch, minButtonHeight, isTouch]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(wrap);
    btnRefs.current.forEach((b) => b && ro.observe(b));
    return () => ro.disconnect();
  }, [compact, stretch, isTouch]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = THEME_OPTIONS.length;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (activeIdx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (activeIdx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(THEME_OPTIONS[next].id);
    btnRefs.current[next]?.focus();
  };

  const activeColor = THEME_OPTIONS[activeIdx].dot;
  const minH = minButtonHeight ?? (isTouch ? 44 : undefined);
  const dotSize = compact ? (stretch ? 12 : 9) : 7;

  return (
    <div
      ref={wrapRef}
      role="radiogroup"
      aria-label="Тема оформления"
      onKeyDown={onKeyDown}
      style={{
        position: 'relative', display: 'flex',
        width: stretch ? '100%' : 'auto', boxSizing: 'border-box',
        borderRadius: 10, border: `1px solid ${t.border}`,
        background: t.bgSurface, padding: 3, overflow: 'hidden',
        '--seg-muted': t.textMuted, '--seg-text': t.text,
        '--seg-accent': t.accent, '--seg-hover': t.navHoverBg,
      } as CSSProperties}
    >
      <div
        className="kbs-seg-pill"
        aria-hidden
        style={{
          position: 'absolute', top: 3, bottom: 3,
          left: pill.left + 3, width: Math.max(pill.width - 6, 0),
          borderRadius: 7, background: activeColor,
          boxShadow: `0 0 20px ${activeColor}55, 0 2px 8px ${activeColor}44`,
          opacity: pill.ready ? 1 : 0,
          transition: prefersReducedMotion ? 'none'
            : 'left .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1), background .4s, box-shadow .4s, opacity .2s',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      {THEME_OPTIONS.map((opt, idx) => {
        const active = idx === activeIdx;
        return (
          <button
            key={opt.id}
            ref={(el) => { btnRefs.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            tabIndex={active ? 0 : -1}
            className="kbs-seg-btn"
            onClick={() => onChange(opt.id)}
            style={{
              position: 'relative', zIndex: 1, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flex: stretch ? 1 : undefined,
              gap: compact ? 0 : 6,
              padding: compact ? (stretch ? '10px 0' : '6px 9px') : '6px 16px',
              minHeight: minH,
              border: 'none', borderRadius: 7, cursor: 'pointer',
              fontSize: 13, fontFamily: 'system-ui',
              whiteSpace: 'nowrap', userSelect: 'none', boxSizing: 'border-box',
              touchAction: 'manipulation',
              '--seg-on': readableOn(opt.dot),
            } as CSSProperties}
          >
            <span
              className="kbs-seg-dot"
              style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: opt.dot, flexShrink: 0,
                boxShadow: active ? `0 0 8px ${opt.dot}` : 'none',
                transform: active && compact ? 'scale(1.15)' : 'scale(1)',
                transition: prefersReducedMotion ? 'none' : 'box-shadow .3s, transform .3s',
              }}
            />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
});

/* ────────────────────────────────────────────────────────────
   Компактный: кнопка-точка + поповер 2×2
   ──────────────────────────────────────────────────────────── */
export const CompactThemeSwitcher = memo(function CompactThemeSwitcher({
  theme, onChange, t, size = 24,
}: ThemeSwitcherProps & { size?: number }) {
  useStyleTag('kbs-theme-switcher-css', CSS);
  const { isTouch, prefersReducedMotion } = useResponsive();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const found = THEME_OPTIONS.findIndex((o) => o.id === theme);
  const activeIdx = found < 0 ? 0 : found;
  const current = THEME_OPTIONS[activeIdx];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => itemRefs.current[activeIdx]?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, activeIdx]);

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = THEME_OPTIONS.length;
    const i = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'ArrowDown') next = (i + 2) % n;
    else if (e.key === 'ArrowUp') next = (i - 2 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    itemRefs.current[next]?.focus();
  };

  const hit = isTouch ? Math.max(size, 44) : size;
  const itemSize = isTouch ? 44 : 28;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        '--seg-accent': t.accent, '--seg-hover': t.navHoverBg,
      } as CSSProperties}
    >
      <button
        ref={btnRef}
        type="button"
        className="kbs-dot-btn"
        onClick={() => setOpen((o) => !o)}
        title={`Тема: ${current.label}`}
        aria-label={`Текущая тема: ${current.label}. Сменить`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        style={{
          width: hit, height: hit, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: `1px solid ${t.border}`,
          borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
        }}
      >
        <span
          style={{
            width: size * 0.5, height: size * 0.5, borderRadius: '50%',
            background: current.dot, boxShadow: `0 0 8px ${current.dot}aa`,
            transition: prefersReducedMotion ? 'none' : 'background .3s, box-shadow .3s',
          }}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label="Выбор темы"
        aria-hidden={!open}
        onKeyDown={onGridKey}
        style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4,
          padding: 6, borderRadius: 10, background: t.bgSurface,
          border: `1px solid ${t.border}`, boxShadow: t.shadowLg, zIndex: 300,
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          transition: prefersReducedMotion ? 'none'
            : `opacity .18s ease, transform .18s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.18s'}`,
        }}
      >
        {THEME_OPTIONS.map((opt, idx) => {
          const active = idx === activeIdx;
          return (
            <button
              key={opt.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              aria-label={opt.label}
              title={opt.label}
              className="kbs-dot-item"
              onClick={() => { onChange(opt.id); setOpen(false); btnRef.current?.focus(); }}
              style={{
                width: itemSize, height: itemSize, padding: 0, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? t.selectedBg : 'transparent',
                border: 'none', cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              <span
                style={{
                  width: 12, height: 12, borderRadius: '50%', background: opt.dot,
                  boxShadow: active ? `0 0 10px ${opt.dot}` : 'none',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                  transition: prefersReducedMotion ? 'none' : 'all .2s',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});