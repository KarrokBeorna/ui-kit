// Header.tsx — единая шапка (horizontal / vertical / mobile drawer) + ThemeSwitcher + LayoutToggle.
//
// ИЗМЕНЕНИЯ:
//  • Все выпадающие меню (подменю навигации, меню пользователя, компактный
//    переключатель темы) рендерятся в portal в document.body с position:fixed.
//    Раньше они жили внутри <nav> с mask-image (создаёт containing block для fixed)
//    и overflow:auto / внутри <aside overflow:hidden> — список обрезался, была
//    видна только тень. zIndex поднят до 900 (выше шестерёнки таблицы, ниже модалок).
//  • Клик по пункту меню больше не считается «кликом вне» (меню вне контейнера
//    из-за портала), фокус корректно возвращается на триггер.

import React, {
  memo, useCallback, useEffect, useId, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { readableOn, themes, type Theme, type ThemeName } from '../themes/theme';
import { useResponsive } from '../context/AppContext';
import { useBodyScrollLock, useIsoLayoutEffect, useStyleTag } from '../hooks';
import { IcoLogIn, IcoLogOut, IcoChevronLeft, IcoChevronRight, IcoX, IcoHorHeader, IcoVerHeader } from './icons';
import Modal from './Modal';
import CustomInput from './CustomInput';

/* ───────────────────────── Типы ───────────────────────── */

/** Пункт подменю шапки. */
export interface HeaderNavTabChild {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Видимость по состоянию авторизации. */
  visible?: (isLoggedIn: boolean) => boolean;
}

/** Пункт навигации шапки. */
export interface HeaderNavTab {
  id: string;
  label: string;
  icon: ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
  children?: HeaderNavTabChild[];
  /** 'replace' — метка/иконка активного ребёнка заменяет родителя. */
  displayMode?: 'keep' | 'replace';
}

/** Раскладка десктопной шапки. */
export type LayoutMode = 'horizontal' | 'vertical';

export interface HeaderProps {
  /** Тема оформления. */
  t: Theme;
  /** Раскладка десктопа; на мобильном всегда drawer. @default 'horizontal' */
  layout?: LayoutMode;
  /** Активный пункт (id таба или ребёнка). */
  activeTab: string;
  /** Навигация. */
  onTabChange: (id: string) => void;
  /** Авторизован ли пользователь. */
  isLoggedIn: boolean;
  /** Клик «Войти». */
  onSignIn: () => void;
  /** Клик «Выйти». */
  onSignOut: () => void;
  /** Имя пользователя. */
  userName?: string;
  /** Пункты навигации (уже отфильтрованные по правам). */
  navTabs: HeaderNavTab[];
  /** Название сайта. @default 'Nexus' */
  siteName?: string;
  /** Логотип. @default '◈' */
  logoSvg?: ReactNode;
  /** Клик «Профиль». */
  onProfileClick?: () => void;
  /** Показывать «Настройки» в меню пользователя. */
  showSettings?: boolean;
  /** Клик «Настройки». */
  onSettingsClick?: () => void;
  /** Показывать переключатель раскладки. */
  showLayoutToggle?: boolean;
  /** Показывать переключатель темы. */
  showThemeSwitcher?: boolean;
  /** Колбэк смены раскладки. */
  onLayoutChange?: (mode: LayoutMode) => void;
  /** Текущая тема. */
  currentTheme?: ThemeName;
  /** Колбэк смены темы. */
  onThemeChange?: (theme: ThemeName) => void;
  /** Показывать московское время. */
  showMoscowTime?: boolean;
  /** Смена пароля: модалка встраивается автоматически. */
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void> | void;
  /** Ключ персиста состояния навигации. @default 'kbs-ui-nav' */
  navStateKey?: string;
  /** Компактные контролы. */
  compactControls?: boolean;
}

/* ───────────────────────── Стили ───────────────────────── */

const HEADER_CSS = `
.kbs-nav-pill { border-radius: 9px; }
.kbs-nav-btn, .kbs-nav-chev { background: transparent; color: var(--kbs-text-muted); font-weight: 400; transition: background .2s cubic-bezier(.4,0,.2,1), color .2s cubic-bezier(.4,0,.2,1); }
.kbs-nav-pill[data-active] .kbs-nav-btn, .kbs-nav-pill[data-active] .kbs-nav-chev { background: var(--kbs-accent); color: var(--kbs-accent-text); font-weight: 600; }
.kbs-nav-pill[data-active] { box-shadow: 0 2px 12px var(--kbs-accent-glow); }
@media (hover: hover) {
  .kbs-nav-pill:not([data-active]):hover .kbs-nav-btn, .kbs-nav-pill:not([data-active]):hover .kbs-nav-chev { background: var(--kbs-hover); color: var(--kbs-text); }
}
.kbs-child-btn { background: transparent; color: var(--kbs-text-muted); font-weight: 400; transition: background .15s, color .15s; }
.kbs-child-btn[data-active] { background: var(--kbs-selected-bg); color: var(--kbs-accent); font-weight: 600; }
@media (hover: hover) { .kbs-child-btn:not([data-active]):hover { background: var(--kbs-hover); color: var(--kbs-text); } }
.kbs-user-menu-item { background: transparent; transition: background .15s; }
.kbs-user-menu-item[data-danger] { color: var(--kbs-danger); }
@media (hover: hover) {
  .kbs-user-menu-item:hover { background: var(--kbs-hover); }
  .kbs-user-menu-item[data-danger]:hover { background: var(--kbs-danger-bg); }
  .kbs-user-chip:hover { border-color: var(--kbs-accent); }
}
.kbs-user-chip { transition: border-color .2s, box-shadow .2s; }
.kbs-icon-btn { background: transparent; color: var(--kbs-text-muted); transition: background .15s, color .15s; }
@media (hover: hover) { .kbs-icon-btn:hover { background: var(--kbs-hover); color: var(--kbs-text); } }
.kbs-nav-btn:focus-visible, .kbs-nav-chev:focus-visible, .kbs-child-btn:focus-visible,
.kbs-user-menu-item:focus-visible, .kbs-user-chip:focus-visible, .kbs-icon-btn:focus-visible,
.kbs-accent-btn:focus-visible { outline: 2px solid var(--kbs-accent); outline-offset: 2px; }
.kbs-nav-icon svg { width: 1em; height: 1em; display: block; flex-shrink: 0; }
.kbs-accent-btn { transition: opacity .2s; }
@media (hover: hover) { .kbs-accent-btn:hover { opacity: .88; } }
.kbs-nav-scroll { scrollbar-width: none; -ms-overflow-style: none; }
.kbs-nav-scroll::-webkit-scrollbar { display: none; }
.kbs-scroll-y { scrollbar-width: thin; scrollbar-color: var(--kbs-border) transparent; overscroll-behavior: contain; }
.kbs-scroll-y::-webkit-scrollbar { width: 8px; }
.kbs-scroll-y::-webkit-scrollbar-track { background: transparent; }
.kbs-scroll-y::-webkit-scrollbar-thumb { background: var(--kbs-border); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
.kbs-scroll-y::-webkit-scrollbar-thumb:hover { background: var(--kbs-text-muted); background-clip: content-box; }
@media (prefers-reduced-motion: reduce) {
  .kbs-nav-btn, .kbs-nav-chev, .kbs-child-btn, .kbs-user-chip, .kbs-icon-btn,
  .kbs-accent-btn, .kbs-menu, .kbs-aside { transition: none !important; }
}
`;

const MOBILE_CSS = `
.kbs-m-icon { display:inline-flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0; color:inherit; }
.kbs-m-icon svg { width:1em; height:1em; display:block; flex-shrink:0; }
.kbs-m-btn { background:transparent; border:none; color:inherit; cursor:pointer; touch-action:manipulation; transition:background .15s, color .15s; }
@media (hover:hover) { .kbs-m-btn:hover { background: var(--m-hover); } }
.kbs-m-btn:focus-visible { outline:2px solid var(--m-accent); outline-offset:-2px; }
.kbs-m-scroll { scrollbar-width:thin; scrollbar-color: var(--m-border) transparent; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
.kbs-m-scroll::-webkit-scrollbar { width:8px; }
.kbs-m-scroll::-webkit-scrollbar-track { background:transparent; }
.kbs-m-scroll::-webkit-scrollbar-thumb { background:var(--m-border); border-radius:8px; border:2px solid transparent; background-clip:content-box; }
@media (prefers-reduced-motion:reduce) { .kbs-m-btn, .kbs-m-drawer, .kbs-m-scrim, .kbs-m-chev { transition:none !important; } }
`;

/** zIndex порталов шапки: выше шестерёнки таблицы (400), ниже модалок (1000). */
const MENU_Z = 900;

function headerVars(t: Theme): CSSProperties {
  return {
    '--kbs-text': t.text, '--kbs-text-muted': t.textMuted,
    '--kbs-accent': t.accent, '--kbs-accent-text': t.accentText, '--kbs-accent-glow': t.accentGlow,
    '--kbs-hover': t.navHoverBg, '--kbs-selected-bg': t.selectedBg,
    '--kbs-danger': t.danger, '--kbs-danger-bg': `${t.danger}18`, '--kbs-border': t.border,
  } as CSSProperties;
}

function NavIcon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <span className="kbs-nav-icon" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, fontSize: size, lineHeight: 1, flexShrink: 0, color: 'inherit',
    }}>
      {children}
    </span>
  );
}

/* ───────────────────────── ThemeSwitcher ───────────────────────── */

const PREFERRED: ThemeName[] = ['dark', 'light', 'vibrant', 'ocean'];
const THEME_OPTIONS = (() => {
  const keys = Object.keys(themes) as ThemeName[];
  const ordered = [...PREFERRED.filter((k) => keys.includes(k)), ...keys.filter((k) => !PREFERRED.includes(k))];
  return ordered.map((id) => ({ id, label: themes[id].label, dot: themes[id].accent }));
})();

const THEME_CSS = `
.kbs-seg-btn { background: transparent; color: var(--seg-muted); transition: color .25s; }
.kbs-seg-btn[aria-checked="true"] { color: var(--seg-on); font-weight: 600; }
@media (hover: hover) {
  .kbs-seg-btn:not([aria-checked="true"]):hover { color: var(--seg-text); }
  .kbs-dot-btn:hover, .kbs-dot-item:hover { background: var(--seg-hover); }
}
.kbs-seg-btn:focus-visible, .kbs-dot-btn:focus-visible, .kbs-dot-item:focus-visible { outline: 2px solid var(--seg-accent); outline-offset: 2px; }
.kbs-dot-btn, .kbs-dot-item { transition: background .15s, transform .15s; }
@media (prefers-reduced-motion: reduce) { .kbs-seg-pill, .kbs-seg-btn, .kbs-seg-dot, .kbs-dot-btn, .kbs-dot-item { transition: none !important; } }
`;

export interface ThemeSwitcherProps {
  /** Активная тема. */
  theme: ThemeName;
  /** Колбэк смены темы. */
  onChange: (theme: ThemeName) => void;
  /** Тема оформления (токены). */
  t: Theme;
  /** Только точки без подписей. */
  compact?: boolean;
  /** Растянуть на всю ширину. */
  stretch?: boolean;
  /** Минимальная высота кнопки (тач-таргет). */
  minButtonHeight?: number;
}

/** Сегментированный переключатель темы (radiogroup + стрелки). */
export const ThemeSwitcher = memo(function ThemeSwitcher({
  theme, onChange, t, compact = false, stretch = false, minButtonHeight,
}: ThemeSwitcherProps) {
  useStyleTag('kbs-theme-switcher-css', THEME_CSS);
  const { isTouch, prefersReducedMotion } = useResponsive();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const found = THEME_OPTIONS.findIndex((o) => o.id === theme);
  const activeIdx = found < 0 ? 0 : found;

  const measure = useCallback(() => {
    const wrap = wrapRef.current, btn = btnRefs.current[activeIdx];
    if (!wrap || !btn) return;
    const cr = wrap.getBoundingClientRect(), br = btn.getBoundingClientRect();
    setPill({ left: br.left - cr.left, width: br.width, ready: true });
  }, [activeIdx]);
  const measureRef = useRef(measure); measureRef.current = measure;
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
    <div ref={wrapRef} role="radiogroup" aria-label="Тема оформления" onKeyDown={onKeyDown}
      style={{
        position: 'relative', display: 'flex', width: stretch ? '100%' : 'auto', boxSizing: 'border-box',
        borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgSurface, padding: 3, overflow: 'hidden',
        '--seg-muted': t.textMuted, '--seg-text': t.text, '--seg-accent': t.accent, '--seg-hover': t.navHoverBg,
      } as CSSProperties}>
      <div className="kbs-seg-pill" aria-hidden style={{
        position: 'absolute', top: 3, bottom: 3, left: pill.left + 3, width: Math.max(pill.width - 6, 0),
        borderRadius: 7, background: activeColor,
        boxShadow: `0 0 20px ${activeColor}55, 0 2px 8px ${activeColor}44`,
        opacity: pill.ready ? 1 : 0,
        transition: prefersReducedMotion ? 'none'
          : 'left .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1), background .4s, box-shadow .4s, opacity .2s',
        pointerEvents: 'none', zIndex: 0,
      }} />
      {THEME_OPTIONS.map((opt, idx) => {
        const active = idx === activeIdx;
        return (
          <button key={opt.id} ref={(el) => { btnRefs.current[idx] = el; }}
            type="button" role="radio" aria-checked={active} aria-label={opt.label} title={opt.label}
            tabIndex={active ? 0 : -1} className="kbs-seg-btn" onClick={() => onChange(opt.id)}
            style={{
              position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: stretch ? 1 : undefined, gap: compact ? 0 : 6,
              padding: compact ? (stretch ? '10px 0' : '6px 9px') : '6px 16px', minHeight: minH,
              border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui',
              whiteSpace: 'nowrap', userSelect: 'none', boxSizing: 'border-box', touchAction: 'manipulation',
              '--seg-on': readableOn(opt.dot),
            } as CSSProperties}>
            <span className="kbs-seg-dot" style={{
              width: dotSize, height: dotSize, borderRadius: '50%', background: opt.dot, flexShrink: 0,
              boxShadow: active ? `0 0 8px ${opt.dot}` : 'none',
              transform: active && compact ? 'scale(1.15)' : 'scale(1)',
              transition: prefersReducedMotion ? 'none' : 'box-shadow .3s, transform .3s',
            }} />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
});

/** Компактный переключатель темы: кнопка-точка + поповер в портале (не обрезается aside). */
const CompactThemeSwitcher = memo(function CompactThemeSwitcher({
  theme, onChange, t, size = 24,
}: ThemeSwitcherProps & { size?: number }) {
  useStyleTag('kbs-theme-switcher-css', THEME_CSS);
  const { isTouch, prefersReducedMotion } = useResponsive();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const found = THEME_OPTIONS.findIndex((o) => o.id === theme);
  const activeIdx = found < 0 ? 0 : found;
  const current = THEME_OPTIONS[activeIdx];

  useIsoLayoutEffect(() => {
    if (!open) return;
    const b = btnRef.current?.getBoundingClientRect();
    const p = popRef.current;
    if (!b || !p) return;
    const w = p.offsetWidth || 100, h = p.offsetHeight || 100;
    const left = Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8));
    let top = b.bottom + 6;
    if (top + h > window.innerHeight - 8 && b.top - h - 6 > 8) top = b.top - h - 6;
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert'); else el.setAttribute('inert', '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
    };
    const onScroll = (e: Event) => { if (!popRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    const raf = requestAnimationFrame(() => itemRefs.current[activeIdx]?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
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

  const popover = (
    <div ref={popRef} id={menuId} role="menu" aria-label="Выбор темы" onKeyDown={onGridKey}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: MENU_Z,
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, padding: 6, borderRadius: 10,
        background: t.bgSurface, border: `1px solid ${t.border}`, boxShadow: t.shadowLg,
        '--seg-accent': t.accent, '--seg-hover': t.navHoverBg,
        opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(-6px)',
        transition: prefersReducedMotion ? 'none'
          : `opacity .18s ease, transform .18s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.18s'}`,
      } as CSSProperties}>
      {THEME_OPTIONS.map((opt, idx) => {
        const active = idx === activeIdx;
        return (
          <button key={opt.id} ref={(el) => { itemRefs.current[idx] = el; }}
            type="button" role="menuitemradio" aria-checked={active} aria-label={opt.label} title={opt.label}
            className="kbs-dot-item"
            onClick={() => { onChange(opt.id); setOpen(false); btnRef.current?.focus(); }}
            style={{
              width: itemSize, height: itemSize, padding: 0, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? t.selectedBg : 'transparent', border: 'none', cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%', background: opt.dot,
              boxShadow: active ? `0 0 10px ${opt.dot}` : 'none',
              transform: active ? 'scale(1.15)' : 'scale(1)',
              transition: prefersReducedMotion ? 'none' : 'all .2s',
            }} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', '--seg-accent': t.accent, '--seg-hover': t.navHoverBg } as CSSProperties}>
      <button ref={btnRef} type="button" className="kbs-dot-btn"
        onClick={() => setOpen((o) => !o)}
        title={`Тема: ${current.label}`} aria-label={`Текущая тема: ${current.label}. Сменить`}
        aria-expanded={open} aria-haspopup="menu" aria-controls={menuId}
        style={{
          width: hit, height: hit, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
        }}>
        <span style={{
          width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: current.dot,
          boxShadow: `0 0 8px ${current.dot}aa`,
          transition: prefersReducedMotion ? 'none' : 'background .3s, box-shadow .3s',
        }} />
      </button>
      {typeof document !== 'undefined' && createPortal(popover, document.body)}
    </div>
  );
});

/* ───────────────────────── LayoutToggle ───────────────────────── */

const LAYOUT_CSS = `
.kbs-layout-btn { background: transparent; color: var(--lt-muted); transition: background .2s ease, color .2s ease; }
.kbs-layout-btn[aria-pressed="true"] { background: var(--lt-accent); color: var(--lt-on); }
@media (hover: hover) {
  .kbs-layout-btn:not([aria-pressed="true"]):hover { background: var(--lt-hover); color: var(--lt-text); }
  .kbs-icon-btn:hover { background: var(--lt-hover); color: var(--lt-text); }
}
.kbs-layout-btn:focus-visible, .kbs-icon-btn:focus-visible { outline: 2px solid var(--lt-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .kbs-layout-btn, .kbs-icon-btn { transition: none !important; } }
`;

const ltVars = (t: Theme): CSSProperties => ({
  '--lt-accent': t.accent, '--lt-on': t.accentText,
  '--lt-muted': t.textMuted, '--lt-text': t.text, '--lt-hover': t.navHoverBg,
} as CSSProperties);

export interface LayoutToggleProps {
  /** Текущая раскладка. */
  mode: LayoutMode;
  /** Колбэк смены раскладки. */
  onChange: (mode: LayoutMode) => void;
  /** Тема оформления. */
  theme: Theme;
  /** Минимальная высота кнопки. */
  minButtonHeight?: number;
}

/** Переключатель горизонтальной/вертикальной шапки. */
export const LayoutToggle = memo(function LayoutToggle({ mode, onChange, theme: t, minButtonHeight }: LayoutToggleProps) {
  useStyleTag('kbs-layout-toggle-css', LAYOUT_CSS);
  const { isTouch } = useResponsive();
  const modes: { id: LayoutMode; label: string }[] = [
    { id: 'horizontal', label: 'Горизонтальное меню' },
    { id: 'vertical', label: 'Вертикальное меню' },
  ];
  return (
    <div role="group" aria-label="Расположение меню" style={{
      display: 'flex', gap: 3, padding: 4, background: t.bgSurface,
      borderRadius: 9, border: `1px solid ${t.border}`, ...ltVars(t),
    }}>
      {modes.map((m) => (
        <button key={m.id} type="button" className="kbs-layout-btn"
          onClick={() => onChange(m.id)} aria-label={m.label} title={m.label} aria-pressed={mode === m.id}
          style={{
            padding: '5px 10px', minHeight: minButtonHeight ?? (isTouch ? 40 : undefined),
            borderRadius: 6, border: 'none', fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', touchAction: 'manipulation',
          }}>
          {m.id === 'horizontal' ? <IcoHorHeader s={14} /> : <IcoVerHeader s={14} />}
        </button>
      ))}
    </div>
  );
});

const CompactLayoutToggle = memo(function CompactLayoutToggle({ mode, onChange, theme: t, size = 24 }: LayoutToggleProps & { size?: number }) {
  useStyleTag('kbs-layout-toggle-css', LAYOUT_CSS);
  const { isTouch } = useResponsive();
  const next: LayoutMode = mode === 'horizontal' ? 'vertical' : 'horizontal';
  const nextLabel = next === 'vertical' ? 'вертикальное' : 'горизонтальное';
  const hit = isTouch ? Math.max(size, 44) : size;
  const Icon = mode === 'horizontal' ? IcoHorHeader : IcoVerHeader;
  return (
    <button type="button" className="kbs-icon-btn" onClick={() => onChange(next)}
      title={`Включить ${nextLabel} меню`} aria-label={`Переключить на ${nextLabel} меню`}
      style={{
        width: hit, height: hit, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation', ...ltVars(t),
      }}>
      <Icon s={Math.round(size * 0.65)} />
    </button>
  );
});

/* ───────────────────────── Московское время ───────────────────────── */

const MSK_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
});

function useMoscowTime(): string {
  const [time, setTime] = useState(() => MSK_FORMAT.format(new Date()));
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const update = () => setTime(MSK_FORMAT.format(new Date()));
    update();
    const now = new Date();
    const timeout = setTimeout(() => { update(); interval = setInterval(update, 60_000); },
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
    const onVis = () => {
      if (document.hidden) { if (interval) clearInterval(interval); interval = null; }
      else { update(); if (!interval) interval = setInterval(update, 60_000); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return time;
}

function MoscowTimeWidget({ t, stacked = false, size = 46 }: { t: Theme; stacked?: boolean; size?: number }) {
  const time = useMoscowTime();
  const base: CSSProperties = {
    fontFamily: "'TT Octosquares', monospace", fontSize: size, fontWeight: 500,
    color: t.textMuted, letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0,
  };
  const label = `Московское время ${time}`;
  if (stacked) {
    const [h, m] = time.split(':');
    return (
      <div aria-label={label} style={{ ...base, lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span>{h}</span><span style={{ marginTop: -2 }}>{m}</span>
      </div>
    );
  }
  return <span aria-label={label} style={{ ...base, lineHeight: 1.2 }}>{time}</span>;
}

/* ───────────────────────── Смена пароля ───────────────────────── */

function ChangePasswordModal({ t, isOpen, onClose, onSubmit }: {
  t: Theme; isOpen: boolean; onClose: () => void;
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void> | void;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldError, setOldError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    setOldError(''); setNewError(''); setConfirmError(''); setSubmitting(false);
  }, [isOpen]);

  const handleSubmit = async () => {
    setOldError(''); setNewError(''); setConfirmError('');
    if (!oldPassword) { setOldError('Введите старый пароль'); return; }
    if (!newPassword) { setNewError('Введите новый пароль'); return; }
    if (newPassword.length < 6) { setNewError('Минимум 6 символов'); return; }
    if (newPassword !== confirmPassword) { setConfirmError('Пароли не совпадают'); return; }
    try {
      setSubmitting(true);
      await onSubmit(oldPassword, newPassword);
      onClose();
    } catch (e) {
      setOldError(e instanceof Error ? e.message : 'Не удалось сменить пароль');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = useMemo(() => [
    { row: 0, col: 0, required: true, content: (
      <CustomInput type="password" label="Старый пароль" theme={t} value={oldPassword} onChange={setOldPassword}
        error={oldError || undefined} disabled={submitting} />
    ) },
    { row: 1, col: 0, required: true, content: (
      <CustomInput type="password" label="Новый пароль" theme={t} value={newPassword} onChange={setNewPassword}
        showStrength error={newError || undefined} disabled={submitting} />
    ) },
    { row: 2, col: 0, required: true, content: (
      <CustomInput type="password" label="Новый пароль (подтверждение)" theme={t} value={confirmPassword}
        onChange={setConfirmPassword} error={confirmError || undefined} disabled={submitting} />
    ) },
  ], [t, oldPassword, newPassword, confirmPassword, oldError, newError, confirmError, submitting]);

  return (
    <Modal theme={t} isOpen={isOpen} onClose={onClose} onOk={handleSubmit}
      title="Смена пароля" columns={1} rows={3} fields={fields}
      okText={submitting ? 'Смена…' : 'Сменить'} cancelText="Отмена" width={420}
      canSubmit={!submitting && !!oldPassword && !!newPassword && !!confirmPassword} />
  );
}

/* ───────────────────────── Контролы / меню ───────────────────────── */

function Controls({ t, compact, direction, showLayoutToggle, showThemeSwitcher, layout, onLayoutChange, currentTheme, onThemeChange }: {
  t: Theme; compact: boolean; direction: 'row' | 'column';
  showLayoutToggle?: boolean; showThemeSwitcher?: boolean;
  layout: LayoutMode; onLayoutChange?: (m: LayoutMode) => void;
  currentTheme?: ThemeName; onThemeChange?: (n: ThemeName) => void;
}) {
  if (!showLayoutToggle && !showThemeSwitcher) return null;
  return (
    <div style={{
      display: 'flex', flexDirection: direction, gap: direction === 'column' ? 2 : 6,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {showLayoutToggle && onLayoutChange && (
        compact
          ? <CompactLayoutToggle mode={layout} onChange={onLayoutChange} theme={t} size={24} />
          : <LayoutToggle mode={layout} onChange={onLayoutChange} theme={t} />
      )}
      {showThemeSwitcher && currentTheme && onThemeChange && (
        compact
          ? <CompactThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} size={24} />
          : <ThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} compact />
      )}
    </div>
  );
}

/** Поведение меню: dismiss по клику вне (учитывая портал) + клавиатура. */
function useMenuBehavior(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  menuRef: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const items = () => {
      const root = menuRef.current ?? containerRef.current;
      return root ? Array.from(root.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter((n) => n.offsetParent !== null) : [];
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeRef.current();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); triggerRef.current?.focus(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const list = items();
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      let n: number;
      if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = list.length - 1;
      else if (e.key === 'ArrowDown') n = i < 0 ? 0 : (i + 1) % list.length;
      else n = i < 0 ? list.length - 1 : (i - 1 + list.length) % list.length;
      list[n]?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => items()[0]?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, containerRef, triggerRef, menuRef]);
}

/** Меню в портале: fixed от якоря, не обрезается nav/aside, zIndex 900. */
function AnchoredMenu({ t, open, anchorRef, menuRef, align = 'left', width = 190, id, onClose, children }: {
  t: Theme; open: boolean; anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement>;
  align?: 'left' | 'right' | 'center'; width?: number; id: string;
  onClose: () => void; children: ReactNode;
}) {
  const { prefersReducedMotion } = useResponsive();
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useIsoLayoutEffect(() => {
    if (!open) return;
    const a = anchorRef.current?.getBoundingClientRect();
    const m = menuRef.current;
    if (!a || !m) return;
    const mw = m.offsetWidth || width, mh = m.offsetHeight || 200;
    let left = align === 'right' ? a.right - mw : align === 'center' ? a.left + a.width / 2 - mw / 2 : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    let top = a.bottom + 6;
    if (top + mh > window.innerHeight - 8 && a.top - mh - 6 > 8) top = a.top - mh - 6;
    setPos({ left, top });
  }, [open, align, width, anchorRef, menuRef]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert'); else el.setAttribute('inert', '');
  }, [open, menuRef]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) closeRef.current(); };
    const onResize = () => closeRef.current();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, menuRef]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={menuRef} id={id} role="menu" className="kbs-menu kbs-scroll-y" style={{
      position: 'fixed', left: pos.left, top: pos.top, zIndex: MENU_Z,
      minWidth: width, maxWidth: 'min(92vw, 320px)', maxHeight: 'min(60vh, 420px)',
      overflowY: 'auto', background: t.bgSurface, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: 6, boxShadow: t.shadowLg,
      display: 'flex', flexDirection: 'column', gap: 2,
      opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
      transform: open ? 'translateY(0)' : 'translateY(-6px)',
      transition: prefersReducedMotion ? 'none'
        : `opacity .18s ease, transform .18s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.18s'}`,
    }}>
      {children}
    </div>,
    document.body,
  );
}

const menuItemStyle = (t: Theme): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '9px 12px', textAlign: 'left', border: 'none', borderRadius: 8,
  fontSize: 13, fontFamily: 'system-ui', color: t.text, cursor: 'pointer',
  minHeight: 36, touchAction: 'manipulation',
});

function UserBlock({ t, userName, isLoggedIn, onSignIn, onSignOut, onProfileClick, onPasswordChangeRequest, onSettingsClick, collapsed = false, hideName = false, align = 'right', fullWidth = false }: {
  t: Theme; userName?: string; isLoggedIn: boolean;
  onSignIn: () => void; onSignOut: () => void;
  onProfileClick?: () => void; onPasswordChangeRequest?: () => void; onSettingsClick?: () => void;
  collapsed?: boolean; hideName?: boolean; align?: 'left' | 'right'; fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => {
    const active = document.activeElement;
    const inside = !!active && (wrapRef.current?.contains(active) || menuRef.current?.contains(active));
    if (inside) btnRef.current?.focus();
    setOpen(false);
  }, []);
  useMenuBehavior(open, wrapRef, btnRef, close, menuRef);

  if (!isLoggedIn) {
    return (
      <button type="button" onClick={onSignIn} className="kbs-accent-btn" aria-label="Войти" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: collapsed ? '9px' : '9px 16px', width: fullWidth ? '100%' : undefined,
        minHeight: 40, borderRadius: 9, border: 'none', background: t.accent, color: t.accentText,
        fontSize: 13.5, fontWeight: 600, fontFamily: 'system-ui', cursor: 'pointer',
        boxShadow: `0 2px 16px ${t.accentGlow}`, touchAction: 'manipulation', flexShrink: 0,
      }}>
        <IcoLogIn s={15} />{!collapsed && 'Войти'}
      </button>
    );
  }

  const items: { id: string; label: string; run: () => void; danger?: boolean }[] = [];
  if (onProfileClick) items.push({ id: 'profile', label: '◈ Профиль', run: onProfileClick });
  if (onSettingsClick) items.push({ id: 'settings', label: '⚙ Настройки', run: onSettingsClick });
  if (onPasswordChangeRequest) items.push({ id: 'password', label: '🔑 Сменить пароль', run: onPasswordChangeRequest });
  items.push({ id: 'signout', label: 'Выйти', run: onSignOut, danger: true });
  const showName = !collapsed && !hideName;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: fullWidth ? '100%' : undefined, flexShrink: 0 }}>
      <button ref={btnRef} type="button" className="kbs-user-chip"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label="Меню пользователя" title={collapsed ? userName : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: showName ? 8 : 0,
          justifyContent: showName ? 'flex-start' : 'center',
          padding: showName ? '5px 12px 5px 6px' : 4, width: fullWidth ? '100%' : undefined,
          minHeight: 40, borderRadius: 24, border: `1px solid ${t.border}`, background: t.bgSurface,
          cursor: 'pointer', touchAction: 'manipulation',
          boxShadow: open ? `0 0 0 2px ${t.accentGlow}` : 'none',
        }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui', flexShrink: 0,
        }}>
          {userName?.[0]?.toUpperCase() ?? '?'}
        </span>
        {showName && (
          <>
            <span style={{
              flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: t.text,
              fontFamily: 'system-ui', lineHeight: 1.2, textAlign: 'left',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{userName}</span>
            <span aria-hidden style={{ color: t.textMuted, fontSize: 10, display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
          </>
        )}
      </button>
      <AnchoredMenu t={t} open={open} anchorRef={btnRef} menuRef={menuRef} align={align} id={menuId} onClose={close}>
        {items.map((item) => (
          <button key={item.id} type="button" role="menuitem" className="kbs-user-menu-item"
            data-danger={item.danger || undefined}
            onClick={() => { close(); item.run(); }}
            style={{ ...menuItemStyle(t), color: item.danger ? t.danger : t.text }}>
            {item.id === 'signout' && <IcoLogOut s={14} />}
            {item.label}
          </button>
        ))}
      </AnchoredMenu>
    </div>
  );
}

/* ───────────────────────── Персист навигации ───────────────────────── */

const filterChildren = (tab: HeaderNavTab, isLoggedIn: boolean): HeaderNavTabChild[] =>
  (tab.children ?? []).filter((c) => (c.visible ? c.visible(isLoggedIn) : true));

function resolveDisplay(tab: HeaderNavTab, children: HeaderNavTabChild[], activeTab: string, lastSelectedChildId?: string) {
  const activeChild = children.find((c) => c.id === activeTab);
  const storedChild = lastSelectedChildId ? children.find((c) => c.id === lastSelectedChildId) : undefined;
  const displayChild = activeChild ?? storedChild;
  const useReplace = tab.displayMode === 'replace';
  return {
    label: useReplace && displayChild ? displayChild.label : tab.label,
    icon: useReplace && displayChild ? displayChild.icon ?? tab.icon : tab.icon,
    targetChildId: displayChild?.id,
  };
}

const resolveMainTarget = (tab: HeaderNavTab, children: HeaderNavTabChild[], targetChildId?: string): string =>
  targetChildId ?? (children.length > 0 ? children[0].id : tab.id);

function usePersistedNavState(storageKey: string, activeTab: string, navTabs: HeaderNavTab[]) {
  const lastKey = `${storageKey}:last`;
  const expandedKey = `${storageKey}:expanded`;
  const [lastSelectedChild, setLastSelectedChild] = useState<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(lastKey) ?? 'null');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const arr = JSON.parse(sessionStorage.getItem(expandedKey) ?? '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  });
  const navTabsRef = useRef(navTabs); navTabsRef.current = navTabs;
  useEffect(() => { try { sessionStorage.setItem(lastKey, JSON.stringify(lastSelectedChild)); } catch { /* ignore */ } }, [lastKey, lastSelectedChild]);
  useEffect(() => { try { sessionStorage.setItem(expandedKey, JSON.stringify([...expandedIds])); } catch { /* ignore */ } }, [expandedKey, expandedIds]);
  useEffect(() => {
    setLastSelectedChild((prev) => {
      let next: Record<string, string> | null = null;
      for (const tab of navTabsRef.current) {
        const child = tab.children?.find((c) => c.id === activeTab);
        if (child && prev[tab.id] !== child.id) { if (!next) next = { ...prev }; next[tab.id] = child.id; }
      }
      return next ?? prev;
    });
  }, [activeTab]);
  return { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds };
}

/* ───────────────────────── Horizontal (desktop) ───────────────────────── */

function HorizontalNavEntry({ t, tab, activeTab, isLoggedIn, lastChildId, open, setOpen, onNavigate, onPick }: {
  t: Theme; tab: HeaderNavTab; activeTab: string; isLoggedIn: boolean;
  lastChildId?: string; open: boolean; setOpen: (v: boolean) => void;
  onNavigate: (id: string) => void; onPick: (parentId: string, childId: string) => void;
}) {
  const children = useMemo(() => filterChildren(tab, isLoggedIn), [tab, isLoggedIn]);
  const hasChildren = children.length > 0;
  const active = activeTab === tab.id || children.some((c) => c.id === activeTab);
  const { label, icon, targetChildId } = resolveDisplay(tab, children, activeTab, lastChildId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chevRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => {
    const a = document.activeElement;
    if (a && (wrapRef.current?.contains(a) || menuRef.current?.contains(a))) chevRef.current?.focus();
    setOpen(false);
  }, [setOpen]);
  useMenuBehavior(open, wrapRef, chevRef, close, menuRef);

  const navigate = () => {
    const target = resolveMainTarget(tab, children, targetChildId);
    if (hasChildren) onPick(tab.id, target);
    setOpen(false);
    onNavigate(target);
  };

  return (
    <div ref={wrapRef} className="kbs-nav-pill" data-active={active || undefined}
      style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button type="button" className="kbs-nav-btn" onClick={navigate} aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
          borderRadius: hasChildren ? '9px 0 0 9px' : 9, border: 'none', cursor: 'pointer',
          fontSize: 13.5, fontFamily: 'system-ui', whiteSpace: 'nowrap', minHeight: 36, touchAction: 'manipulation',
        }}>
        <NavIcon size={15}>{icon}</NavIcon>
        <span>{label}</span>
      </button>
      {hasChildren && (
        <button ref={chevRef} type="button" className="kbs-nav-chev" onClick={() => setOpen(!open)}
          aria-label={`Подменю «${label}»`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px 8px 7px 4px', borderRadius: '0 9px 9px 0', border: 'none',
            cursor: 'pointer', minHeight: 36, touchAction: 'manipulation',
          }}>
          <span aria-hidden style={{ fontSize: 9, lineHeight: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        </button>
      )}
      {hasChildren && (
        <AnchoredMenu t={t} open={open} anchorRef={chevRef} menuRef={menuRef} align="center" id={menuId} onClose={close} width={200}>
          {children.map((child) => {
            const childActive = activeTab === child.id;
            return (
              <button key={child.id} type="button" role="menuitem" className="kbs-child-btn"
                data-active={childActive || undefined} aria-current={childActive ? 'page' : undefined}
                onClick={() => { onPick(tab.id, child.id); close(); onNavigate(child.id); }}
                style={menuItemStyle(t)}>
                {child.icon && <NavIcon size={15}>{child.icon}</NavIcon>}
                <span>{child.label}</span>
              </button>
            );
          })}
        </AnchoredMenu>
      )}
    </div>
  );
}

function DesktopHorizontalHeader(p: HeaderProps & { onPasswordChangeRequest?: () => void }) {
  const { isTablet } = useResponsive();
  const {
    t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName, navTabs,
    siteName = 'Nexus', logoSvg = '◈', onProfileClick, showSettings = false, onSettingsClick,
    showLayoutToggle = false, showThemeSwitcher = false, layout = 'horizontal', onLayoutChange,
    currentTheme, onThemeChange, showMoscowTime = false,
    navStateKey = 'kbs-ui-nav', compactControls = false, onPasswordChangeRequest,
  } = p;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { lastSelectedChild, setLastSelectedChild } = usePersistedNavState(navStateKey, activeTab, navTabs);
  useEffect(() => { setOpenMenuId(null); }, [activeTab]);
  const visibleTabs = useMemo(() => navTabs.filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true)), [navTabs, isLoggedIn]);
  const pick = useCallback((parentId: string, childId: string) =>
    setLastSelectedChild((prev) => ({ ...prev, [parentId]: childId })), [setLastSelectedChild]);
  const compact = compactControls || isTablet;

  return (
    <header style={{
      ...headerVars(t), display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isTablet ? '0 12px' : '0 24px', height: 56,
      background: t.bgSurface, borderBottom: `1px solid ${t.border}`,
      boxShadow: t.shadow, position: 'sticky', top: 0, zIndex: 100, gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, background: t.accent, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui',
          boxShadow: `0 0 16px ${t.accentGlow}`,
        }}>{logoSvg}</div>
        {!isTablet && (
          <span style={{ fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {siteName}
          </span>
        )}
      </div>
      <nav className="kbs-nav-scroll" aria-label="Основная навигация" style={{
        flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'visible',
        maskImage: 'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
      }}>
        <div style={{ display: 'flex', gap: 2, width: 'max-content', margin: '0 auto', padding: '2px 14px' }}>
          {visibleTabs.map((tab) => (
            <HorizontalNavEntry key={tab.id} t={t} tab={tab} activeTab={activeTab} isLoggedIn={isLoggedIn}
              lastChildId={lastSelectedChild[tab.id]}
              open={openMenuId === tab.id} setOpen={(v) => setOpenMenuId(v ? tab.id : null)}
              onNavigate={onTabChange} onPick={pick} />
          ))}
        </div>
      </nav>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Controls t={t} compact={compact} direction={compactControls ? 'column' : 'row'}
          layout={layout} onLayoutChange={onLayoutChange}
          currentTheme={currentTheme} onThemeChange={onThemeChange}
          showLayoutToggle={showLayoutToggle} showThemeSwitcher={showThemeSwitcher} />
        {showMoscowTime && <MoscowTimeWidget t={t} size={isTablet ? 26 : 46} />}
        <UserBlock t={t} userName={userName} isLoggedIn={isLoggedIn}
          onSignIn={onSignIn} onSignOut={onSignOut} onProfileClick={onProfileClick}
          onSettingsClick={showSettings ? onSettingsClick : undefined}
          onPasswordChangeRequest={onPasswordChangeRequest} hideName={isTablet} />
      </div>
    </header>
  );
}

/* ───────────────────────── Vertical (desktop) ───────────────────────── */

const VERTICAL_EXPANDED_WIDTH = 220;
const VERTICAL_COLLAPSED_WIDTH = 64;

function DesktopVerticalHeader(p: HeaderProps & { onPasswordChangeRequest?: () => void }) {
  const {
    t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName, navTabs,
    siteName = 'Nexus', logoSvg = '◈', onProfileClick, showSettings = false, onSettingsClick,
    showLayoutToggle = false, showThemeSwitcher = false, layout = 'vertical', onLayoutChange,
    currentTheme, onThemeChange, showMoscowTime = false,
    navStateKey = 'kbs-ui-nav', compactControls = false, onPasswordChangeRequest,
  } = p;
  const collapsedKey = `${navStateKey}:collapsed`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(collapsedKey) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(collapsedKey, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsedKey, collapsed]);

  const { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds } =
    usePersistedNavState(navStateKey, activeTab, navTabs);
  const visibleTabs = useMemo(() => navTabs.filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true)), [navTabs, isLoggedIn]);

  const userClosedRef = useRef<Set<string>>(new Set());
  useEffect(() => { userClosedRef.current = new Set(); }, [activeTab]);
  useEffect(() => {
    setExpandedIds((prev) => {
      let next: Set<string> | null = null;
      for (const tab of visibleTabs) {
        if (!tab.children || userClosedRef.current.has(tab.id)) continue;
        if (tab.children.some((c) => c.id === activeTab) && !prev.has(tab.id)) {
          if (!next) next = new Set(prev);
          next.add(tab.id);
        }
      }
      return next ?? prev;
    });
  }, [activeTab, visibleTabs, setExpandedIds]);

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); userClosedRef.current.add(id); }
      else { next.add(id); userClosedRef.current.delete(id); }
      return next;
    });

  const w = collapsed ? VERTICAL_COLLAPSED_WIDTH : VERTICAL_EXPANDED_WIDTH;
  return (
    <aside className="kbs-aside" style={{
      ...headerVars(t), width: w, height: '100%', background: t.bgSurface,
      borderRight: `1px solid ${t.border}`, boxShadow: t.shadow,
      display: 'flex', flexDirection: 'column',
      transition: 'width .32s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '18px 0' : '16px 16px 16px 18px',
        borderBottom: `1px solid ${t.borderSubtle}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, overflow: 'hidden' }}>
          <div style={{
            width: 30, height: 30, background: t.accent, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: t.accentText, fontWeight: 700, flexShrink: 0,
            boxShadow: `0 0 16px ${t.accentGlow}`,
          }}>{logoSvg}</div>
          <span style={{
            fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text,
            letterSpacing: '-0.01em', whiteSpace: 'nowrap',
            opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 120,
            transition: 'opacity .2s, max-width .32s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
          }}>{siteName}</span>
        </div>
        {!collapsed && (
          <button type="button" className="kbs-icon-btn" onClick={() => setCollapsed(true)}
            aria-label="Свернуть меню" title="Свернуть меню"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 6, flexShrink: 0 }}>
            <IcoChevronLeft s={16} />
          </button>
        )}
      </div>

      <nav className="kbs-scroll-y" aria-label="Основная навигация" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {collapsed && (
          <button type="button" className="kbs-icon-btn" onClick={() => setCollapsed(false)}
            aria-label="Развернуть меню" title="Развернуть меню"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36,
              marginBottom: 6, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>
            <IcoChevronRight s={16} />
          </button>
        )}
        {visibleTabs.map((tab) => {
          const children = filterChildren(tab, isLoggedIn);
          const hasChildren = children.length > 0;
          const active = activeTab === tab.id || children.some((c) => c.id === activeTab);
          const expanded = expandedIds.has(tab.id);
          const { label, icon, targetChildId } = resolveDisplay(tab, children, activeTab, lastSelectedChild[tab.id]);
          const navigate = () => {
            const target = resolveMainTarget(tab, children, targetChildId);
            if (hasChildren) setLastSelectedChild((prev) => ({ ...prev, [tab.id]: target }));
            onTabChange(target);
          };
          return (
            <div key={tab.id}>
              <div className="kbs-nav-pill" data-active={active || undefined}
                style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <button type="button" className="kbs-nav-btn"
                  onClick={() => { if (!collapsed && hasChildren && !expanded) { toggleExpanded(tab.id); return; } navigate(); }}
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '9px' : '9px 12px',
                    borderRadius: hasChildren && !collapsed ? '9px 0 0 9px' : 9,
                    border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'system-ui',
                    whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, minHeight: 38, touchAction: 'manipulation',
                  }}>
                  <NavIcon size={17}>{icon}</NavIcon>
                  {!collapsed && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{label}</span>
                  )}
                </button>
                {hasChildren && !collapsed && (
                  <button type="button" className="kbs-nav-chev" onClick={() => toggleExpanded(tab.id)}
                    aria-label={`Подменю «${label}»`} aria-expanded={expanded}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '9px 10px', borderRadius: '0 9px 9px 0', border: 'none',
                      cursor: 'pointer', minHeight: 38, touchAction: 'manipulation',
                    }}>
                    <span aria-hidden style={{ display: 'flex', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                      <IcoChevronRight s={12} />
                    </span>
                  </button>
                )}
              </div>
              {hasChildren && expanded && !collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 22, marginTop: 2, marginBottom: 4 }}>
                  {children.map((child) => {
                    const childActive = activeTab === child.id;
                    return (
                      <button key={child.id} type="button" className="kbs-child-btn"
                        data-active={childActive || undefined} aria-current={childActive ? 'page' : undefined}
                        onClick={() => { setLastSelectedChild((prev) => ({ ...prev, [tab.id]: child.id })); onTabChange(child.id); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui',
                          textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          width: '100%', minHeight: 34, touchAction: 'manipulation',
                        }}>
                        {child.icon && <NavIcon size={14}>{child.icon}</NavIcon>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {(showLayoutToggle || showThemeSwitcher) && (
        <div style={{ padding: 8, borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
          <Controls t={t} compact={compactControls || collapsed} direction={collapsed ? 'column' : 'row'}
            layout={layout} onLayoutChange={onLayoutChange}
            currentTheme={currentTheme} onThemeChange={onThemeChange}
            showLayoutToggle={showLayoutToggle} showThemeSwitcher={showThemeSwitcher} />
        </div>
      )}
      <div style={{
        padding: 8, borderTop: `1px solid ${t.borderSubtle}`, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        {showMoscowTime && <MoscowTimeWidget t={t} stacked={collapsed} size={collapsed ? 30 : 40} />}
        <UserBlock t={t} userName={userName} isLoggedIn={isLoggedIn}
          onSignIn={onSignIn} onSignOut={onSignOut} onProfileClick={onProfileClick}
          onSettingsClick={showSettings ? onSettingsClick : undefined}
          onPasswordChangeRequest={onPasswordChangeRequest}
          collapsed={collapsed} align="left" fullWidth />
      </div>
    </aside>
  );
}

/* ───────────────────────── Mobile drawer ───────────────────────── */

const TOUCH = 48;

function MIco({ size, children }: { size: number; children?: ReactNode }) {
  if (!children) return null;
  return <span className="kbs-m-icon" style={{ width: size, height: size, fontSize: size }}>{children}</span>;
}

function MobileDrawerHeader(p: HeaderProps & { onPasswordChangeRequest?: () => void }) {
  const {
    t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName, navTabs,
    siteName = 'Nexus', logoSvg = '◈', currentTheme, onThemeChange,
    showThemeSwitcher = false, showMoscowTime = false,
    onProfileClick, onPasswordChangeRequest, onSettingsClick, showSettings = false,
  } = p;
  const { prefersReducedMotion } = useResponsive();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerId = useId();

  const close = useCallback(() => {
    const drawer = drawerRef.current;
    if (drawer && drawer.contains(document.activeElement)) triggerRef.current?.focus();
    setOpen(false);
  }, []);
  useBodyScrollLock(open);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const visibleTabs = useMemo(() =>
    navTabs
      .filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true))
      .map((tab) => tab.children
        ? { ...tab, children: tab.children.filter((c) => (c.visible ? c.visible(isLoggedIn) : true)) }
        : tab)
      .filter((tab) => !tab.children || tab.children.length > 0),
    [navTabs, isLoggedIn]);

  useEffect(() => {
    const parents = visibleTabs.filter((tab) => tab.children?.some((c) => c.id === activeTab)).map((tab) => tab.id);
    if (!parents.length) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of parents) if (!next.has(id)) { next.add(id); changed = true; }
      return changed ? next : prev;
    });
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert'); else el.setAttribute('inert', '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const sel = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const list = () => Array.from(drawer.querySelectorAll<HTMLElement>(sel)).filter((el) => el.offsetParent !== null);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = list();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => list()[0]?.focus());
    return () => { document.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    if (!el) return;
    let x0 = 0, y0 = 0, tracking = false;
    const start = (e: TouchEvent) => { const pt = e.touches[0]; x0 = pt.clientX; y0 = pt.clientY; tracking = true; };
    const move = (e: TouchEvent) => {
      if (!tracking) return;
      const pt = e.touches[0];
      const dx = pt.clientX - x0, dy = pt.clientY - y0;
      if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) { tracking = false; close(); }
    };
    const end = () => { tracking = false; };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
    };
  }, [open, close]);

  const go = (id: string) => { close(); onTabChange(id); };
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const vars = { '--m-accent': t.accent, '--m-hover': t.navHoverBg, '--m-border': t.border, '--m-muted': t.textMuted } as CSSProperties;

  const renderLeaf = (item: HeaderNavTab | HeaderNavTabChild, active: boolean, indent: number) => (
    <button key={item.id} type="button" className="kbs-m-btn" onClick={() => go(item.id)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        minHeight: TOUCH, padding: '12px 16px', paddingLeft: 16 + indent * 20, marginBottom: 4,
        background: active ? t.accent : 'transparent', color: active ? t.accentText : t.text,
        borderRadius: 10, textAlign: 'left', fontSize: indent > 0 ? 14 : 15,
        fontFamily: 'inherit', fontWeight: active ? 600 : 400,
        boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none',
      }}>
      <MIco size={indent > 0 ? 18 : 20}>{item.icon}</MIco>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );

  const renderGroup = (tab: HeaderNavTab) => {
    const children = tab.children!;
    if (tab.displayMode === 'replace') {
      return (
        <div key={tab.id} style={{ marginBottom: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            <MIco size={12}>{tab.icon}</MIco>
            <span>{tab.label}</span>
          </div>
          {children.map((c) => renderLeaf(c, activeTab === c.id, 1))}
        </div>
      );
    }
    const isExpanded = expandedIds.has(tab.id);
    const anyActive = activeTab === tab.id || children.some((c) => c.id === activeTab);
    const highlight = anyActive && !isExpanded;
    return (
      <div key={tab.id} style={{ marginBottom: 4 }}>
        <button type="button" className="kbs-m-btn" onClick={() => toggleExpanded(tab.id)}
          aria-expanded={isExpanded} aria-current={activeTab === tab.id ? 'page' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            minHeight: TOUCH, padding: '12px 16px',
            background: highlight ? t.accent : 'transparent', color: highlight ? t.accentText : t.text,
            borderRadius: 10, textAlign: 'left', fontSize: 15, fontFamily: 'inherit', fontWeight: anyActive ? 600 : 400,
          }}>
          <MIco size={20}>{tab.icon}</MIco>
          <span style={{ flex: 1 }}>{tab.label}</span>
          <span className="kbs-m-chev" aria-hidden style={{
            display: 'flex', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s',
            color: highlight ? t.accentText : t.textMuted,
          }}>
            <IcoChevronRight s={14} />
          </span>
        </button>
        {isExpanded && <div style={{ marginTop: 2 }}>{children.map((c) => renderLeaf(c, activeTab === c.id, 1))}</div>}
      </div>
    );
  };

  const accountAction = (label: string, onClick: () => void) => (
    <button key={label} type="button" className="kbs-m-btn" onClick={() => { close(); onClick(); }}
      style={{
        width: '100%', minHeight: TOUCH, padding: '12px 16px', color: t.text,
        borderRadius: 10, textAlign: 'left', fontSize: 15, fontFamily: 'inherit', marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
      {label}
    </button>
  );

  const effectiveSettings = showSettings ? onSettingsClick : undefined;

  return (
    <>
      <header style={{
        ...vars, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        paddingLeft: 'calc(14px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(14px + env(safe-area-inset-right, 0px))',
        background: t.bgSurface, borderBottom: `1px solid ${t.border}`,
        color: t.text, position: 'sticky', top: 0, zIndex: 100, minHeight: 56,
      }}>
        <button ref={triggerRef} type="button" className="kbs-m-btn"
          aria-label="Открыть меню" aria-expanded={open} aria-controls={drawerId}
          onClick={() => setOpen(true)}
          style={{
            fontSize: 22, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, minHeight: 44, borderRadius: 8, color: t.text,
          }}>☰</button>
        <div style={{
          width: 30, height: 30, background: t.accent, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: t.accentText, fontWeight: 700,
          boxShadow: `0 0 14px ${t.accentGlow}`, flexShrink: 0,
        }}>{logoSvg}</div>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {siteName}
        </div>
        {showMoscowTime && (
          <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <MoscowTimeWidget t={t} size={17} />
          </span>
        )}
      </header>

      <div className="kbs-m-scrim" onClick={close} role="presentation" style={{
        position: 'fixed', inset: 0, background: 'rgba(6, 8, 14, 0.55)',
        backdropFilter: open ? 'blur(2px)' : 'none', zIndex: 1000,
        opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
        transition: prefersReducedMotion ? 'none' : `opacity .2s ease, visibility 0s linear ${open ? '0s' : '.2s'}`,
      }}>
        <aside ref={drawerRef} id={drawerId} onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true" aria-label="Главное меню" className="kbs-m-drawer"
          style={{
            ...vars, position: 'absolute', top: 0, left: 0, bottom: 0, width: '82%', maxWidth: 340,
            background: t.bgSurface, color: t.text, display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)', boxShadow: t.shadowLg,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            visibility: open ? 'visible' : 'hidden',
            transition: prefersReducedMotion ? 'none'
              : `transform .25s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.25s'}`,
            willChange: 'transform',
          }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, background: t.accent, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: t.accentText, fontWeight: 700, flexShrink: 0,
              }}>{logoSvg}</div>
              <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteName}</span>
            </div>
            <button type="button" className="kbs-m-btn" aria-label="Закрыть меню" onClick={close}
              style={{
                color: t.iconColor, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0,
              }}>
              <IcoX s={18} />
            </button>
          </div>

          <nav className="kbs-m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8 }}>
            {visibleTabs.map((tab) =>
              tab.children && tab.children.length > 0 ? renderGroup(tab) : renderLeaf(tab, activeTab === tab.id, 0))}
          </nav>

          {showThemeSwitcher && currentTheme && onThemeChange && (
            <div style={{ padding: 14, borderTop: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Тема</div>
              <ThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} compact stretch minButtonHeight={44} />
            </div>
          )}

          <div style={{ padding: 14, borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
            {isLoggedIn ? (
              <>
                <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </div>
                {onProfileClick && accountAction('◈ Профиль', onProfileClick)}
                {effectiveSettings && accountAction('⚙ Настройки', effectiveSettings)}
                {onPasswordChangeRequest && accountAction('🔑 Сменить пароль', onPasswordChangeRequest)}
                <button type="button" className="kbs-m-btn" onClick={() => { close(); onSignOut(); }}
                  style={{
                    width: '100%', minHeight: TOUCH, padding: '12px 16px',
                    background: t.danger, color: '#ffffff', borderRadius: 10,
                    fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  <IcoLogOut s={16} /> Выйти
                </button>
              </>
            ) : (
              <button type="button" className="kbs-m-btn" onClick={() => { close(); onSignIn(); }}
                style={{
                  width: '100%', minHeight: TOUCH, padding: '12px 16px',
                  background: t.accent, color: t.accentText, borderRadius: 10,
                  fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 2px 16px ${t.accentGlow}`,
                }}>
                <IcoLogIn s={16} /> Войти
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/* ───────────────────────── Header ───────────────────────── */

/**
 * Шапка приложения: мобильный drawer на узком экране, горизонтальная или
 * вертикальная раскладка на десктопе. Модалка смены пароля встраивается
 * автоматически при передаче onPasswordChange.
 */
export const Header = memo(function Header(props: HeaderProps) {
  useStyleTag('kbs-header-styles', HEADER_CSS);
  useStyleTag('kbs-mobile-header-css', MOBILE_CSS);
  const { isMobile } = useResponsive();
  const [pwdOpen, setPwdOpen] = useState(false);
  const onPasswordChangeRequest = props.onPasswordChange ? () => setPwdOpen(true) : undefined;
  const layout = props.layout ?? 'horizontal';
  const inner = isMobile
    ? <MobileDrawerHeader {...props} onPasswordChangeRequest={onPasswordChangeRequest} />
    : layout === 'vertical'
      ? <DesktopVerticalHeader {...props} onPasswordChangeRequest={onPasswordChangeRequest} />
      : <DesktopHorizontalHeader {...props} onPasswordChangeRequest={onPasswordChangeRequest} />;
  return (
    <>
      {inner}
      {props.onPasswordChange && (
        <ChangePasswordModal t={props.t} isOpen={pwdOpen} onClose={() => setPwdOpen(false)} onSubmit={props.onPasswordChange} />
      )}
    </>
  );
});