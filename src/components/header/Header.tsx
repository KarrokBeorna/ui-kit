import {
  memo, useCallback, useEffect, useId, useMemo, useRef, useState,
  type CSSProperties, type Dispatch, type MouseEvent as ReactMouseEvent,
  type ReactNode, type RefObject, type SetStateAction,
} from 'react';
import type { Theme, ThemeName } from '../../themes/theme';
import { IcoLogIn, IcoLogOut, IcoChevronLeft, IcoChevronRight } from '../icons';
import { LayoutToggle, CompactLayoutToggle, LayoutMode } from './LayoutToggle';
import { ThemeSwitcher, CompactThemeSwitcher, useStyleTag, useIsoLayoutEffect } from './ThemeSwitcher';
import { MobileHeader } from './MobileHeader';
import Modal from '../Modal';
import PasswordInput from '../inputs/PasswordInput';
import { useResponsive } from '../../context/ResponsiveContext';

/* ─────────────────────────── Типы ─────────────────────────── */

export interface NavTabChild {
  id: string;
  label: string;
  icon?: ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
}
export interface NavTab {
  id: string;
  label: string;
  icon: ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
  children?: NavTabChild[];
  displayMode?: 'keep' | 'replace';
}

interface HeaderBaseProps {
  t: Theme;
  activeTab: string;
  onTabChange: (id: string) => void;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  userName?: string;
  navTabs: NavTab[];
  siteName?: string;
  logoSvg?: ReactNode;
  onProfileClick?: () => void;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  showLayoutToggle?: boolean;
  showThemeSwitcher?: boolean;
  layoutMode?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  currentTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  showMoscowTime?: boolean;
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void> | void;
  navStateKey?: string;
  compactControls?: boolean;
}

const DEFAULT_NAV_STATE_KEY = 'kbs-ui-nav';

/* ─────────────────────── Стили и переменные ─────────────────────── */

const HEADER_CSS_ID = 'kbs-header-styles';
const HEADER_CSS = `
.kbs-nav-pill { border-radius: 9px; }
.kbs-nav-btn, .kbs-nav-chev {
  background: transparent; color: var(--kbs-text-muted); font-weight: 400;
  transition: background .2s cubic-bezier(.4,0,.2,1), color .2s cubic-bezier(.4,0,.2,1);
}
.kbs-nav-pill[data-active] .kbs-nav-btn,
.kbs-nav-pill[data-active] .kbs-nav-chev {
  background: var(--kbs-accent); color: var(--kbs-accent-text); font-weight: 600;
}
.kbs-nav-pill[data-active] { box-shadow: 0 2px 12px var(--kbs-accent-glow); }
@media (hover: hover) {
  .kbs-nav-pill:not([data-active]):hover .kbs-nav-btn,
  .kbs-nav-pill:not([data-active]):hover .kbs-nav-chev { background: var(--kbs-hover); color: var(--kbs-text); }
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

function headerVars(t: Theme): CSSProperties {
  return {
    '--kbs-text': t.text,
    '--kbs-text-muted': t.textMuted,
    '--kbs-accent': t.accent,
    '--kbs-accent-text': t.accentText,
    '--kbs-accent-glow': t.accentGlow,
    '--kbs-hover': t.navHoverBg,
    '--kbs-selected-bg': t.selectedBg,
    '--kbs-danger': t.danger,
    '--kbs-danger-bg': `${t.danger}18`,
    '--kbs-border': t.border,
  } as CSSProperties;
}

export function NavIcon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <span
      className="kbs-nav-icon"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, fontSize: size, lineHeight: 1,
        flexShrink: 0, color: 'inherit',
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────── Хелперы ─────────────────────────── */

const filterChildren = (tab: NavTab, isLoggedIn: boolean): NavTabChild[] =>
  (tab.children ?? []).filter((c) => (c.visible ? c.visible(isLoggedIn) : true));

function resolveDisplay(
  tab: NavTab, children: NavTabChild[], activeTab: string, lastSelectedChildId?: string,
) {
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

function resolveMainTarget(tab: NavTab, children: NavTabChild[], targetChildId?: string): string {
  return targetChildId ?? (children.length > 0 ? children[0].id : tab.id);
}

interface PersistedNavState {
  lastSelectedChild: Record<string, string>;
  setLastSelectedChild: Dispatch<SetStateAction<Record<string, string>>>;
  expandedIds: Set<string>;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
}

function usePersistedNavState(storageKey: string, activeTab: string, navTabs: NavTab[]): PersistedNavState {
  const lastKey = `${storageKey}:last`;
  const expandedKey = `${storageKey}:expanded`;

  const [lastSelectedChild, setLastSelectedChild] = useState<Record<string, string>>(() => {
    try {
      const raw = sessionStorage.getItem(lastKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const arr = JSON.parse(sessionStorage.getItem(expandedKey) ?? '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  });

  const navTabsRef = useRef(navTabs);
  navTabsRef.current = navTabs;

  useEffect(() => {
    try { sessionStorage.setItem(lastKey, JSON.stringify(lastSelectedChild)); } catch { /* ignore */ }
  }, [lastKey, lastSelectedChild]);
  useEffect(() => {
    try { sessionStorage.setItem(expandedKey, JSON.stringify([...expandedIds])); } catch { /* ignore */ }
  }, [expandedKey, expandedIds]);

  useEffect(() => {
    setLastSelectedChild((prev) => {
      let next: Record<string, string> | null = null;
      for (const tab of navTabsRef.current) {
        const child = tab.children?.find((c) => c.id === activeTab);
        if (child && prev[tab.id] !== child.id) {
          if (!next) next = { ...prev };
          next[tab.id] = child.id;
        }
      }
      return next ?? prev;
    });
  }, [activeTab]);

  return { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds };
}

/* ─────────────── Поведение меню: dismiss + клавиатура ─────────────── */

function useMenuBehavior(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const items = () =>
      Array.from(el.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
        .filter((n) => n.offsetParent !== null);

    const onPointer = (e: PointerEvent) => {
      if (el.contains(e.target as Node)) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        triggerRef.current?.focus();
        return;
      }
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
  }, [open, containerRef, triggerRef]);
}

/**
 * Меню в fixed-позиции от якоря — не обрезается скроллящимися
 * контейнерами навигации. Закрывается при скролле/resize страницы.
 *
 * Закрытое состояние = `inert` + отложенный `visibility: hidden`.
 * `aria-hidden` намеренно НЕ используется: он применяется мгновенно,
 * а фокус ещё может быть внутри → Chrome блокирует его с предупреждением.
 */
function AnchoredMenu({
  t, open, anchorRef, align = 'left', width = 190, id, onClose, children,
}: {
  t: Theme; open: boolean; anchorRef: RefObject<HTMLElement | null>;
  align?: 'left' | 'right' | 'center'; width?: number; id: string;
  onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useResponsive();
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useIsoLayoutEffect(() => {
    if (!open) return;
    const a = anchorRef.current?.getBoundingClientRect();
    const m = ref.current;
    if (!a || !m) return;
    const mw = m.offsetWidth || width;
    const mh = m.offsetHeight || 200;
    let left = align === 'right' ? a.right - mw : align === 'center' ? a.left + a.width / 2 - mw / 2 : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    let top = a.bottom + 6;
    if (top + mh > window.innerHeight - 8 && a.top - mh - 6 > 8) top = a.top - mh - 6;
    setPos({ left, top });
  }, [open, align, width, anchorRef]);

  /* inert снимает фокус сам и убирает поддерево из AT — без конфликтов. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      closeRef.current();
    };
    const onResize = () => closeRef.current();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      className="kbs-menu kbs-scroll-y"
      style={{
        position: 'fixed', left: pos.left, top: pos.top,
        minWidth: width, maxWidth: 'min(92vw, 320px)', maxHeight: 'min(60vh, 420px)',
        overflowY: 'auto', background: t.bgSurface, border: `1px solid ${t.border}`,
        borderRadius: 12, padding: 6, boxShadow: t.shadowLg, zIndex: 300,
        display: 'flex', flexDirection: 'column', gap: 2,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(-6px)',
        transition: prefersReducedMotion ? 'none'
          : `opacity .18s ease, transform .18s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.18s'}`,
      }}
    >
      {children}
    </div>
  );
}

const menuItemStyle = (t: Theme): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '9px 12px', textAlign: 'left', border: 'none', borderRadius: 8,
  fontSize: 13, fontFamily: 'system-ui', color: t.text, cursor: 'pointer',
  minHeight: 36, touchAction: 'manipulation',
});

/* ─────────────────────── MoscowTimeWidget ─────────────────────── */

const MSK_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
});

function MoscowTimeWidget({ t, stacked = false, size = 46 }: { t: Theme; stacked?: boolean; size?: number }) {
  const [time, setTime] = useState({ hours: '00', minutes: '00' });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      const parts = MSK_FORMAT.formatToParts(new Date());
      setTime({
        hours: parts.find((p) => p.type === 'hour')?.value ?? '00',
        minutes: parts.find((p) => p.type === 'minute')?.value ?? '00',
      });
    };
    update();
    const now = new Date();
    const timeoutId = setTimeout(() => {
      update();
      intervalId = setInterval(update, 60_000);
    }, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());

    const onVisibility = () => {
      if (document.hidden) { if (intervalId) clearInterval(intervalId); intervalId = null; }
      else { update(); if (!intervalId) intervalId = setInterval(update, 60_000); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const base: CSSProperties = {
    fontFamily: "'TT Octosquares', monospace", fontSize: size, fontWeight: 500,
    color: t.textMuted, letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0,
  };
  const label = `Московское время ${time.hours}:${time.minutes}`;

  if (stacked) {
    return (
      <div aria-label={label} style={{ ...base, lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span>{time.hours}</span>
        <span style={{ marginTop: -2 }}>{time.minutes}</span>
      </div>
    );
  }
  return <span aria-label={label} style={{ ...base, lineHeight: 1.2 }}>{time.hours}:{time.minutes}</span>;
}

/* ─────────────────────── ChangePasswordModal ─────────────────────── */

function ChangePasswordModal({
  t, isOpen, onClose, onSubmit,
}: {
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
      <PasswordInput label="Старый пароль" theme={t} value={oldPassword} onChange={setOldPassword}
        error={oldError || undefined} disabled={submitting} showStrength={false} />
    ) },
    { row: 1, col: 0, required: true, content: (
      <PasswordInput label="Новый пароль" theme={t} value={newPassword} onChange={setNewPassword}
        showStrength error={newError || undefined} disabled={submitting} />
    ) },
    { row: 2, col: 0, required: true, content: (
      <PasswordInput label="Новый пароль (подтверждение)" theme={t} value={confirmPassword}
        onChange={setConfirmPassword} error={confirmError || undefined} disabled={submitting} />
    ) },
  ], [t, oldPassword, newPassword, confirmPassword, oldError, newError, confirmError, submitting]);

  return (
    <Modal
      theme={t} isOpen={isOpen} onClose={onClose} onOk={handleSubmit}
      title="Смена пароля" columns={1} rows={3} fields={fields}
      okText={submitting ? 'Смена…' : 'Сменить'} cancelText="Отмена" width={420}
      canSubmit={!submitting && !!oldPassword && !!newPassword && !!confirmPassword}
    />
  );
}

/* ─────────────────────────── Controls ─────────────────────────── */

function Controls({
  t, compact, direction, showLayoutToggle, showThemeSwitcher,
  layoutMode, onLayoutChange, currentTheme, onThemeChange,
}: {
  t: Theme; compact: boolean; direction: 'row' | 'column';
  showLayoutToggle?: boolean; showThemeSwitcher?: boolean;
  layoutMode?: LayoutMode; onLayoutChange?: (m: LayoutMode) => void;
  currentTheme?: ThemeName; onThemeChange?: (n: ThemeName) => void;
}) {
  if (!showLayoutToggle && !showThemeSwitcher) return null;
  return (
    <div
      style={{
        display: 'flex', flexDirection: direction,
        gap: direction === 'column' ? 2 : 6,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      {showLayoutToggle && layoutMode && onLayoutChange && (
        compact
          ? <CompactLayoutToggle mode={layoutMode} onChange={onLayoutChange} theme={t} size={24} />
          : <LayoutToggle mode={layoutMode} onChange={onLayoutChange} theme={t} />
      )}
      {showThemeSwitcher && currentTheme && onThemeChange && (
        compact
          ? <CompactThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} size={24} />
          : <ThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} compact />
      )}
    </div>
  );
}

/* ─────────────────────────── UserBlock ─────────────────────────── */

function UserBlock({
  t, userName, isLoggedIn, onSignIn, onSignOut, onProfileClick,
  onPasswordChangeRequest, onSettingsClick, collapsed = false, hideName = false,
  align = 'right', fullWidth = false,
}: {
  t: Theme; userName?: string; isLoggedIn: boolean;
  onSignIn: () => void; onSignOut: () => void;
  onProfileClick?: () => void; onPasswordChangeRequest?: () => void;
  onSettingsClick?: () => void; collapsed?: boolean; hideName?: boolean;
  align?: 'left' | 'right'; fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  /* Фокус уводим на триггер ДО закрытия — иначе он останется
     в поддереве, которое становится inert/hidden. */
  const close = useCallback(() => {
    const wrap = wrapRef.current;
    if (wrap && wrap.contains(document.activeElement)) btnRef.current?.focus();
    setOpen(false);
  }, []);

  useMenuBehavior(open, wrapRef, btnRef, close);

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="kbs-accent-btn"
        aria-label="Войти"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: collapsed ? '9px' : '9px 16px', width: fullWidth ? '100%' : undefined,
          minHeight: 40, borderRadius: 9, border: 'none',
          background: t.accent, color: t.accentText,
          fontSize: 13.5, fontWeight: 600, fontFamily: 'system-ui',
          cursor: 'pointer', boxShadow: `0 2px 16px ${t.accentGlow}`,
          touchAction: 'manipulation', flexShrink: 0,
        }}
      >
        <IcoLogIn s={15} />
        {!collapsed && 'Войти'}
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
      <button
        ref={btnRef}
        type="button"
        className="kbs-user-chip"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Меню пользователя"
        title={collapsed ? userName : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: showName ? 8 : 0,
          justifyContent: showName ? 'flex-start' : 'center',
          padding: showName ? '5px 12px 5px 6px' : 4,
          width: fullWidth ? '100%' : undefined,
          minHeight: 40, borderRadius: 24,
          border: `1px solid ${t.border}`, background: t.bgSurface,
          cursor: 'pointer', touchAction: 'manipulation',
          boxShadow: open ? `0 0 0 2px ${t.accentGlow}` : 'none',
        }}
      >
        <span
          style={{
            width: 28, height: 28, borderRadius: '50%', background: t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: t.accentText, fontWeight: 700,
            fontFamily: 'system-ui', flexShrink: 0,
          }}
        >
          {userName?.[0]?.toUpperCase() ?? '?'}
        </span>
        {showName && (
          <>
            <span
              style={{
                flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: t.text,
                fontFamily: 'system-ui', lineHeight: 1.2, textAlign: 'left',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </span>
            <span
              aria-hidden
              style={{
                color: t.textMuted, fontSize: 10, display: 'flex',
                transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s',
              }}
            >▾</span>
          </>
        )}
      </button>

      <AnchoredMenu t={t} open={open} anchorRef={btnRef} align={align} id={menuId} onClose={close}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className="kbs-user-menu-item"
            data-danger={item.danger || undefined}
            onClick={() => { close(); item.run(); }}
            style={{ ...menuItemStyle(t), color: item.danger ? t.danger : t.text }}
          >
            {item.id === 'signout' && <IcoLogOut s={14} />}
            {item.label}
          </button>
        ))}
      </AnchoredMenu>
    </div>
  );
}

/* ─────────────────── Мобильная делегация ─────────────────── */

function MobileHeaderAdapter(p: HeaderBaseProps) {
  const [pwdOpen, setPwdOpen] = useState(false);
  return (
    <>
      <MobileHeader
        t={p.t}
        activeTab={p.activeTab}
        onTabChange={p.onTabChange}
        isLoggedIn={p.isLoggedIn}
        onSignIn={p.onSignIn}
        onSignOut={p.onSignOut}
        userName={p.userName}
        navTabs={p.navTabs}
        siteName={p.siteName}
        logoSvg={p.logoSvg}
        currentTheme={p.currentTheme}
        onThemeChange={p.onThemeChange}
        showThemeSwitcher={p.showThemeSwitcher}
        showMoscowTime={p.showMoscowTime}
        onProfileClick={p.onProfileClick}
        onSettingsClick={p.showSettings ? p.onSettingsClick : undefined}
        onPasswordChangeRequest={p.onPasswordChange ? () => setPwdOpen(true) : undefined}
      />
      {p.onPasswordChange && (
        <ChangePasswordModal
          t={p.t} isOpen={pwdOpen}
          onClose={() => setPwdOpen(false)} onSubmit={p.onPasswordChange}
        />
      )}
    </>
  );
}

/* ─────────────────── Horizontal: пункт навигации ─────────────────── */

function HorizontalNavEntry({
  t, tab, activeTab, isLoggedIn, lastChildId, open, setOpen, onNavigate, onPick,
}: {
  t: Theme; tab: NavTab; activeTab: string; isLoggedIn: boolean;
  lastChildId?: string; open: boolean; setOpen: (v: boolean) => void;
  onNavigate: (id: string) => void; onPick: (parentId: string, childId: string) => void;
}) {
  const children = useMemo(() => filterChildren(tab, isLoggedIn), [tab, isLoggedIn]);
  const hasChildren = children.length > 0;
  const active = activeTab === tab.id || children.some((c) => c.id === activeTab);
  const { label, icon, targetChildId } = resolveDisplay(tab, children, activeTab, lastChildId);

  const wrapRef = useRef<HTMLDivElement>(null);
  const chevRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback(() => {
    const wrap = wrapRef.current;
    if (wrap && wrap.contains(document.activeElement)) chevRef.current?.focus();
    setOpen(false);
  }, [setOpen]);

  useMenuBehavior(open, wrapRef, chevRef, close);

  const navigate = () => {
    const target = resolveMainTarget(tab, children, targetChildId);
    if (hasChildren) onPick(tab.id, target);
    setOpen(false);
    onNavigate(target);
  };

  return (
    <div ref={wrapRef} className="kbs-nav-pill" data-active={active || undefined} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        type="button"
        className="kbs-nav-btn"
        onClick={navigate}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: hasChildren ? '9px 0 0 9px' : 9,
          border: 'none', cursor: 'pointer', fontSize: 13.5,
          fontFamily: 'system-ui', whiteSpace: 'nowrap', minHeight: 36,
          touchAction: 'manipulation',
        }}
      >
        <NavIcon size={15}>{icon}</NavIcon>
        <span>{label}</span>
      </button>
      {hasChildren && (
        <button
          ref={chevRef}
          type="button"
          className="kbs-nav-chev"
          onClick={() => setOpen(!open)}
          aria-label={`Подменю «${label}»`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px 8px 7px 4px', borderRadius: '0 9px 9px 0',
            border: 'none', cursor: 'pointer', minHeight: 36, touchAction: 'manipulation',
          }}
        >
          <span
            aria-hidden
            style={{ fontSize: 9, lineHeight: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          >▾</span>
        </button>
      )}
      {hasChildren && (
        <AnchoredMenu t={t} open={open} anchorRef={chevRef} align="center" id={menuId} onClose={close} width={200}>
          {children.map((child) => {
            const childActive = activeTab === child.id;
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                className="kbs-child-btn"
                data-active={childActive || undefined}
                aria-current={childActive ? 'page' : undefined}
                onClick={() => { onPick(tab.id, child.id); close(); onNavigate(child.id); }}
                style={menuItemStyle(t)}
              >
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

/* ─────────────────────── HorizontalHeader ─────────────────────── */

function DesktopHorizontalHeader(p: HeaderBaseProps) {
  useStyleTag(HEADER_CSS_ID, HEADER_CSS);
  const { isTablet } = useResponsive();
  const {
    t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName, navTabs,
    siteName = 'Nexus', logoSvg = '◈', onProfileClick, showSettings = false, onSettingsClick,
    showLayoutToggle = false, showThemeSwitcher = false, layoutMode, onLayoutChange,
    currentTheme, onThemeChange, showMoscowTime = false, onPasswordChange,
    navStateKey = DEFAULT_NAV_STATE_KEY, compactControls = false,
  } = p;

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const { lastSelectedChild, setLastSelectedChild } = usePersistedNavState(navStateKey, activeTab, navTabs);

  useEffect(() => { setOpenMenuId(null); }, [activeTab]);

  const visibleTabs = useMemo(
    () => navTabs.filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true)),
    [navTabs, isLoggedIn],
  );
  const pick = useCallback(
    (parentId: string, childId: string) => setLastSelectedChild((prev) => ({ ...prev, [parentId]: childId })),
    [setLastSelectedChild],
  );

  const compact = compactControls || isTablet;

  return (
    <>
      <header
        style={{
          ...headerVars(t),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isTablet ? '0 12px' : '0 24px', height: 56,
          background: t.bgSurface, borderBottom: `1px solid ${t.border}`,
          boxShadow: t.shadow, position: 'sticky', top: 0, zIndex: 100, gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 28, height: 28, background: t.accent, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui',
              boxShadow: `0 0 16px ${t.accentGlow}`,
            }}
          >
            {logoSvg}
          </div>
          {!isTablet && (
            <span style={{ fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {siteName}
            </span>
          )}
        </div>

        <nav
          className="kbs-nav-scroll"
          aria-label="Основная навигация"
          style={{
            flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'visible',
            maskImage: 'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', gap: 2, width: 'max-content', margin: '0 auto', padding: '2px 14px' }}>
            {visibleTabs.map((tab) => (
              <HorizontalNavEntry
                key={tab.id}
                t={t} tab={tab} activeTab={activeTab} isLoggedIn={isLoggedIn}
                lastChildId={lastSelectedChild[tab.id]}
                open={openMenuId === tab.id}
                setOpen={(v) => setOpenMenuId(v ? tab.id : null)}
                onNavigate={onTabChange}
                onPick={pick}
              />
            ))}
          </div>
        </nav>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Controls
            t={t} compact={compact} direction={compactControls ? 'column' : 'row'}
            layoutMode={layoutMode} onLayoutChange={onLayoutChange}
            currentTheme={currentTheme} onThemeChange={onThemeChange}
            showLayoutToggle={showLayoutToggle} showThemeSwitcher={showThemeSwitcher}
          />
          {showMoscowTime && <MoscowTimeWidget t={t} size={isTablet ? 26 : 46} />}
          <UserBlock
            t={t} userName={userName} isLoggedIn={isLoggedIn}
            onSignIn={onSignIn} onSignOut={onSignOut}
            onProfileClick={onProfileClick}
            onSettingsClick={showSettings ? onSettingsClick : undefined}
            onPasswordChangeRequest={onPasswordChange ? () => setPwdOpen(true) : undefined}
            hideName={isTablet}
          />
        </div>
      </header>
      {onPasswordChange && (
        <ChangePasswordModal t={t} isOpen={pwdOpen} onClose={() => setPwdOpen(false)} onSubmit={onPasswordChange} />
      )}
    </>
  );
}

export const HorizontalHeader = memo(function HorizontalHeader(props: HeaderBaseProps) {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileHeaderAdapter {...props} /> : <DesktopHorizontalHeader {...props} />;
});

/* ─────────────────────── VerticalHeader ─────────────────────── */

const VERTICAL_EXPANDED_WIDTH = 220;
const VERTICAL_COLLAPSED_WIDTH = 64;

function DesktopVerticalHeader(p: HeaderBaseProps) {
  useStyleTag(HEADER_CSS_ID, HEADER_CSS);
  const {
    t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName, navTabs,
    siteName = 'Nexus', logoSvg = '◈', onProfileClick, showSettings = false, onSettingsClick,
    showLayoutToggle = false, showThemeSwitcher = false, layoutMode, onLayoutChange,
    currentTheme, onThemeChange, showMoscowTime = false, onPasswordChange,
    navStateKey = DEFAULT_NAV_STATE_KEY, compactControls = false,
  } = p;

  const collapsedKey = `${navStateKey}:collapsed`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(collapsedKey) === '1'; } catch { return false; }
  });
  const [pwdOpen, setPwdOpen] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(collapsedKey, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsedKey, collapsed]);

  const { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds } =
    usePersistedNavState(navStateKey, activeTab, navTabs);

  const visibleTabs = useMemo(
    () => navTabs.filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true)),
    [navTabs, isLoggedIn],
  );

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
    <>
      <aside
        className="kbs-aside"
        style={{
          ...headerVars(t),
          width: w, height: '100%', background: t.bgSurface,
          borderRight: `1px solid ${t.border}`, boxShadow: t.shadow,
          display: 'flex', flexDirection: 'column',
          transition: 'width .32s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '18px 0' : '16px 16px 16px 18px',
            borderBottom: `1px solid ${t.borderSubtle}`, flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, overflow: 'hidden' }}>
            <div
              style={{
                width: 30, height: 30, background: t.accent, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: t.accentText, fontWeight: 700, flexShrink: 0,
                boxShadow: `0 0 16px ${t.accentGlow}`,
              }}
            >
              {logoSvg}
            </div>
            <span
              style={{
                fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text,
                letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 120,
                transition: 'opacity .2s, max-width .32s cubic-bezier(.4,0,.2,1)',
                overflow: 'hidden',
              }}
            >
              {siteName}
            </span>
          </div>
          {!collapsed && (
            <button
              type="button" className="kbs-icon-btn"
              onClick={() => setCollapsed(true)}
              aria-label="Свернуть меню" title="Свернуть меню"
              style={{ border: 'none', cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 6, flexShrink: 0 }}
            >
              <IcoChevronLeft s={16} />
            </button>
          )}
        </div>

        <nav
          className="kbs-scroll-y"
          aria-label="Основная навигация"
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
            padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {collapsed && (
            <button
              type="button" className="kbs-icon-btn"
              onClick={() => setCollapsed(false)}
              aria-label="Развернуть меню" title="Развернуть меню"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 36, marginBottom: 6, borderRadius: 8, border: 'none',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
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
                <div
                  className="kbs-nav-pill"
                  data-active={active || undefined}
                  style={{ display: 'flex', alignItems: 'center', width: '100%' }}
                >
                  <button
                    type="button" className="kbs-nav-btn"
                    onClick={() => {
                      if (!collapsed && hasChildren && !expanded) { toggleExpanded(tab.id); return; }
                      navigate();
                    }}
                    aria-current={active ? 'page' : undefined}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '9px' : '9px 12px',
                      borderRadius: hasChildren && !collapsed ? '9px 0 0 9px' : 9,
                      border: 'none', cursor: 'pointer', fontSize: 13.5,
                      fontFamily: 'system-ui', whiteSpace: 'nowrap',
                      overflow: 'hidden', flex: 1, minHeight: 38, touchAction: 'manipulation',
                    }}
                  >
                    <NavIcon size={17}>{icon}</NavIcon>
                    {!collapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
                        {label}
                      </span>
                    )}
                  </button>
                  {hasChildren && !collapsed && (
                    <button
                      type="button" className="kbs-nav-chev"
                      onClick={() => toggleExpanded(tab.id)}
                      aria-label={`Подменю «${label}»`}
                      aria-expanded={expanded}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '9px 10px', borderRadius: '0 9px 9px 0',
                        border: 'none', cursor: 'pointer', minHeight: 38, touchAction: 'manipulation',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{ display: 'flex', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
                      >
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
                        <button
                          key={child.id} type="button" className="kbs-child-btn"
                          data-active={childActive || undefined}
                          aria-current={childActive ? 'page' : undefined}
                          onClick={() => {
                            setLastSelectedChild((prev) => ({ ...prev, [tab.id]: child.id }));
                            onTabChange(child.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 7, border: 'none',
                            cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui',
                            textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', width: '100%', minHeight: 34,
                            touchAction: 'manipulation',
                          }}
                        >
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
          <div
            style={{
              padding: 8, borderTop: `1px solid ${t.borderSubtle}`,
              display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
            }}
          >
            <Controls
              t={t} compact={compactControls || collapsed}
              direction={collapsed ? 'column' : 'row'}
              layoutMode={layoutMode} onLayoutChange={onLayoutChange}
              currentTheme={currentTheme} onThemeChange={onThemeChange}
              showLayoutToggle={showLayoutToggle} showThemeSwitcher={showThemeSwitcher}
            />
          </div>
        )}

        <div
          style={{
            padding: 8, borderTop: `1px solid ${t.borderSubtle}`, flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          {showMoscowTime && <MoscowTimeWidget t={t} stacked={collapsed} size={collapsed ? 30 : 40} />}
          <UserBlock
            t={t} userName={userName} isLoggedIn={isLoggedIn}
            onSignIn={onSignIn} onSignOut={onSignOut}
            onProfileClick={onProfileClick}
            onSettingsClick={showSettings ? onSettingsClick : undefined}
            onPasswordChangeRequest={onPasswordChange ? () => setPwdOpen(true) : undefined}
            collapsed={collapsed} align="left" fullWidth
          />
        </div>
      </aside>
      {onPasswordChange && (
        <ChangePasswordModal t={t} isOpen={pwdOpen} onClose={() => setPwdOpen(false)} onSubmit={onPasswordChange} />
      )}
    </>
  );
}

export const VerticalHeader = memo(function VerticalHeader(props: HeaderBaseProps) {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileHeaderAdapter {...props} /> : <DesktopVerticalHeader {...props} />;
});