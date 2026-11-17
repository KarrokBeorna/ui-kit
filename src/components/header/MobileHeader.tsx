import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import type { Theme, ThemeName } from '../../themes/theme';
import { IcoLogIn, IcoLogOut, IcoX, IcoChevronRight } from '../icons';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { ThemeSwitcher, useStyleTag } from './ThemeSwitcher';
import { useResponsive } from '../../context/ResponsiveContext';

export interface MobileNavTabChild {
  id: string;
  label: string;
  icon?: ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
}
export interface MobileNavTab {
  id: string;
  label: string;
  icon?: ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
  children?: MobileNavTabChild[];
  displayMode?: 'keep' | 'replace';
}

export interface MobileHeaderProps {
  t: Theme;
  activeTab: string;
  onTabChange: (id: string) => void;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  userName?: string;
  navTabs: MobileNavTab[];
  siteName?: string;
  logoSvg?: ReactNode;
  currentTheme?: ThemeName;
  onThemeChange?: (t: ThemeName) => void;
  showThemeSwitcher?: boolean;
  showMoscowTime?: boolean;
  onProfileClick?: () => void;
  onPasswordChangeRequest?: () => void;
  onSettingsClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CSS = `
.kbs-m-icon { display:inline-flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0; color:inherit; }
.kbs-m-icon svg { width:1em; height:1em; display:block; flex-shrink:0; }
.kbs-m-btn { background:transparent; border:none; color:inherit; cursor:pointer; touch-action:manipulation; transition:background .15s, color .15s; }
@media (hover:hover) { .kbs-m-btn:hover { background: var(--m-hover); } }
.kbs-m-btn:focus-visible { outline:2px solid var(--m-accent); outline-offset:-2px; }
.kbs-m-scroll { scrollbar-width:thin; scrollbar-color: var(--m-border) transparent; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
.kbs-m-scroll::-webkit-scrollbar { width:8px; }
.kbs-m-scroll::-webkit-scrollbar-track { background:transparent; }
.kbs-m-scroll::-webkit-scrollbar-thumb { background:var(--m-border); border-radius:8px; border:2px solid transparent; background-clip:content-box; }
.kbs-m-scroll::-webkit-scrollbar-thumb:hover { background:var(--m-muted); background-clip:content-box; }
@media (prefers-reduced-motion:reduce) { .kbs-m-btn, .kbs-m-drawer, .kbs-m-scrim, .kbs-m-chev { transition:none !important; } }
`;

const MSK = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
});

function MobileClock({ t }: { t: Theme }) {
  const [time, setTime] = useState(() => MSK.format(new Date()));
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const update = () => setTime(MSK.format(new Date()));
    update();
    const now = new Date();
    const timeout = setTimeout(() => {
      update();
      interval = setInterval(update, 60_000);
    }, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
    const onVisibility = () => {
      if (document.hidden) { if (interval) clearInterval(interval); interval = null; }
      else { update(); if (!interval) interval = setInterval(update, 60_000); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return (
    <span
      aria-label={`Московское время ${time}`}
      style={{
        marginLeft: 'auto', flexShrink: 0, fontFamily: "'TT Octosquares', monospace",
        fontSize: 17, fontWeight: 500, color: t.textMuted, letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      {time}
    </span>
  );
}

function MIco({ size, children }: { size: number; children?: ReactNode }) {
  if (!children) return null;
  return <span className="kbs-m-icon" style={{ width: size, height: size, fontSize: size }}>{children}</span>;
}

const TOUCH = 48;

export function MobileHeader({
  t, activeTab, onTabChange, isLoggedIn, onSignIn, onSignOut, userName,
  navTabs, siteName = 'Nexus', logoSvg = '◈', currentTheme, onThemeChange,
  showThemeSwitcher = false, showMoscowTime = false,
  onProfileClick, onPasswordChangeRequest, onSettingsClick,
  open: externalOpen, onOpenChange,
}: MobileHeaderProps) {
  useStyleTag('kbs-mobile-header-css', CSS);
  const { prefersReducedMotion } = useResponsive();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;

  const openChangeRef = useRef(onOpenChange);
  openChangeRef.current = onOpenChange;
  const setOpen = useCallback((v: boolean) => {
    if (openChangeRef.current) openChangeRef.current(v);
    else setInternalOpen(v);
  }, []);
  const close = useCallback(() => setOpen(false), [setOpen]);

  useBodyScrollLock(open);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerId = useId();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const visibleTabs = useMemo(
    () =>
      navTabs
        .filter((tab) => (tab.visible ? tab.visible(isLoggedIn) : true))
        .map((tab) =>
          tab.children
            ? { ...tab, children: tab.children.filter((c) => (c.visible ? c.visible(isLoggedIn) : true)) }
            : tab,
        )
        .filter((tab) => !tab.children || tab.children.length > 0),
    [navTabs, isLoggedIn],
  );

  useEffect(() => {
    const parents = visibleTabs
      .filter((tab) => tab.children?.some((c) => c.id === activeTab))
      .map((tab) => tab.id);
    if (!parents.length) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of parents) if (!next.has(id)) { next.add(id); changed = true; }
      return changed ? next : prev;
    });
  }, [activeTab, visibleTabs]);

  /* Фокус-ловушка: список пересчитывается на каждое нажатие (аккордеон меняет DOM). */
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const sel = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const list = () =>
      Array.from(drawer.querySelectorAll<HTMLElement>(sel)).filter((el) => el.offsetParent !== null);
    const onKey = (e: KeyboardEvent) => {
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

  /* Возврат фокуса на бургер после закрытия. */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  /* Свайп влево закрывает drawer; вертикальный скролл не перехватывается. */
  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    if (!el) return;
    let x0 = 0, y0 = 0, tracking = false;
    const start = (e: TouchEvent) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; tracking = true; };
    const move = (e: TouchEvent) => {
      if (!tracking) return;
      const p = e.touches[0];
      const dx = p.clientX - x0, dy = p.clientY - y0;
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

  const go = (id: string) => { onTabChange(id); close(); };
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const vars = {
    '--m-accent': t.accent, '--m-hover': t.navHoverBg,
    '--m-border': t.border, '--m-muted': t.textMuted,
  } as CSSProperties;

  const renderLeaf = (item: MobileNavTab | MobileNavTabChild, active: boolean, indent: number) => (
    <button
      key={item.id}
      type="button"
      className="kbs-m-btn"
      onClick={() => go(item.id)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        minHeight: TOUCH, padding: '12px 16px', paddingLeft: 16 + indent * 20,
        marginBottom: 4,
        background: active ? t.accent : 'transparent',
        color: active ? t.accentText : t.text,
        borderRadius: 10, textAlign: 'left',
        fontSize: indent > 0 ? 14 : 15, fontFamily: 'inherit',
        fontWeight: active ? 600 : 400,
        boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none',
      }}
    >
      <MIco size={indent > 0 ? 18 : 20}>{item.icon}</MIco>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );

  const renderGroup = (tab: MobileNavTab) => {
    const children = tab.children!;
    if (tab.displayMode === 'replace') {
      return (
        <div key={tab.id} style={{ marginBottom: 4 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              fontSize: 11, color: t.textMuted, textTransform: 'uppercase',
              letterSpacing: '0.07em', fontWeight: 600,
            }}
          >
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
        <button
          type="button"
          className="kbs-m-btn"
          onClick={() => toggleExpanded(tab.id)}
          aria-expanded={isExpanded}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            minHeight: TOUCH, padding: '12px 16px',
            background: highlight ? t.accent : 'transparent',
            color: highlight ? t.accentText : t.text,
            borderRadius: 10, textAlign: 'left', fontSize: 15,
            fontFamily: 'inherit', fontWeight: anyActive ? 600 : 400,
          }}
        >
          <MIco size={20}>{tab.icon}</MIco>
          <span style={{ flex: 1 }}>{tab.label}</span>
          <span
            className="kbs-m-chev"
            aria-hidden
            style={{
              display: 'flex', transform: isExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform .2s', color: highlight ? t.accentText : t.textMuted,
            }}
          >
            <IcoChevronRight s={14} />
          </span>
        </button>
        {isExpanded && (
          <div style={{ marginTop: 2 }}>
            {children.map((c) => renderLeaf(c, activeTab === c.id, 1))}
          </div>
        )}
      </div>
    );
  };

  const accountAction = (label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      className="kbs-m-btn"
      onClick={() => { close(); onClick(); }}
      style={{
        width: '100%', minHeight: TOUCH, padding: '12px 16px',
        color: t.text, borderRadius: 10, textAlign: 'left',
        fontSize: 15, fontFamily: 'inherit', marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <header
        style={{
          ...vars,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
          paddingLeft: 'calc(14px + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(14px + env(safe-area-inset-right, 0px))',
          background: t.bgSurface, borderBottom: `1px solid ${t.border}`,
          color: t.text, position: 'sticky', top: 0, zIndex: 100, minHeight: 56,
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          className="kbs-m-btn"
          aria-label="Открыть меню"
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setOpen(true)}
          style={{
            fontSize: 22, lineHeight: 1, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, minHeight: 44, borderRadius: 8, color: t.text,
          }}
        >
          ☰
        </button>
        <div
          style={{
            width: 30, height: 30, background: t.accent, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: t.accentText, fontWeight: 700,
            boxShadow: `0 0 14px ${t.accentGlow}`, flexShrink: 0,
          }}
        >
          {logoSvg}
        </div>
        <div
          style={{
            fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {siteName}
        </div>
        {showMoscowTime && <MobileClock t={t} />}
      </header>

      <div
        className="kbs-m-scrim"
        onClick={close}
        role="presentation"
        aria-hidden={!open}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(6, 8, 14, 0.55)',
          backdropFilter: open ? 'blur(2px)' : 'none',
          zIndex: 1000, opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: prefersReducedMotion ? 'none'
            : `opacity .2s ease, visibility 0s linear ${open ? '0s' : '.2s'}`,
        }}
      >
        <aside
          ref={drawerRef}
          id={drawerId}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Главное меню"
          className="kbs-m-drawer"
          style={{
            ...vars,
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: '82%', maxWidth: 340,
            background: t.bgSurface, color: t.text,
            display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            boxShadow: t.shadowLg,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            visibility: open ? 'visible' : 'hidden',
            transition: prefersReducedMotion ? 'none'
              : `transform .25s cubic-bezier(.4,0,.2,1), visibility 0s linear ${open ? '0s' : '.25s'}`,
            willChange: 'transform',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 30, height: 30, background: t.accent, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: t.accentText, fontWeight: 700, flexShrink: 0,
                }}
              >
                {logoSvg}
              </div>
              <span
                style={{
                  fontWeight: 700, fontSize: 15, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {siteName}
              </span>
            </div>
            <button
              type="button"
              className="kbs-m-btn"
              aria-label="Закрыть меню"
              onClick={close}
              style={{
                color: t.iconColor, padding: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44, borderRadius: 8, flexShrink: 0,
              }}
            >
              <IcoX s={18} />
            </button>
          </div>

          <nav className="kbs-m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8 }}>
            {visibleTabs.map((tab) =>
              tab.children && tab.children.length > 0
                ? renderGroup(tab)
                : renderLeaf(tab, activeTab === tab.id, 0),
            )}
          </nav>

          {showThemeSwitcher && currentTheme && onThemeChange && (
            <div
              style={{
                padding: 14, borderTop: `1px solid ${t.border}`,
                flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11, color: t.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}
              >
                Тема
              </div>
              <ThemeSwitcher
                theme={currentTheme}
                onChange={onThemeChange}
                t={t}
                compact
                stretch
                minButtonHeight={44}
              />
            </div>
          )}

          <div style={{ padding: 14, borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
            {isLoggedIn ? (
              <>
                <div
                  style={{
                    fontSize: 14, color: t.textMuted, marginBottom: 10,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {userName}
                </div>
                {onProfileClick && accountAction('◈ Профиль', onProfileClick)}
                {onSettingsClick && accountAction('⚙ Настройки', onSettingsClick)}
                {onPasswordChangeRequest && accountAction('🔑 Сменить пароль', onPasswordChangeRequest)}
                <button
                  type="button"
                  className="kbs-m-btn"
                  onClick={() => { close(); onSignOut(); }}
                  style={{
                    width: '100%', minHeight: TOUCH, padding: '12px 16px',
                    background: t.danger, color: '#ffffff', borderRadius: 10,
                    fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <IcoLogOut s={16} /> Выйти
                </button>
              </>
            ) : (
              <button
                type="button"
                className="kbs-m-btn"
                onClick={() => { close(); onSignIn(); }}
                style={{
                  width: '100%', minHeight: TOUCH, padding: '12px 16px',
                  background: t.accent, color: t.accentText, borderRadius: 10,
                  fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 2px 16px ${t.accentGlow}`,
                }}
              >
                <IcoLogIn s={16} /> Войти
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}