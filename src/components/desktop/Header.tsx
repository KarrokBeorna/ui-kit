import { useState, useEffect, useRef } from 'react';
import { Theme, ThemeName } from '../../themes/theme';
import { IcoLogIn, IcoLogOut, IcoChevronLeft, IcoChevronRight } from '../icons';
import { LayoutToggle, LayoutMode } from './LayoutToggle';
import { ThemeSwitcher } from '../ThemeSwitcher';
import Modal from '../Modal';
import PasswordInput from '../inputs/PasswordInput';

/* ──────────────────────────────────────────────────────────── */
/*  Типы                                                       */
/* ──────────────────────────────────────────────────────────── */

export interface NavTabChild {
  id: string;
  label: string;
  /** Любой React-элемент: эмодзи-строка, SVG, компонент. */
  icon?: React.ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
}

export interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  visible?: (isLoggedIn: boolean) => boolean;
  /** Под-опции (детей) — превращают вкладку в меню / аккордеон. */
  children?: NavTabChild[];
  /**
   * 'keep'    — общая метка вкладки (по умолчанию);
   * 'replace' — метка и иконка вкладки заменяются на выбранного ребёнка.
   */
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
  logoSvg?: React.ReactNode;
  showProfile?: boolean;
  showSettings?: boolean;
  showLayoutToggle?: boolean;
  showThemeSwitcher?: boolean;
  layoutMode?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  currentTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  showMoscowTime?: boolean;
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void> | void;
  /**
   * Ключ sessionStorage для сохранения состояния навигации.
   * По умолчанию — `kbs-ui-nav`.
   */
  navStateKey?: string;
}

/* ──────────────────────────────────────────────────────────── */
/*  Константы                                                  */
/* ──────────────────────────────────────────────────────────── */

/**
 * Ширина зоны справа от кнопки таба (в px), клик по которой
 * открывает/закрывает выпадающий список. Не зависит от длины метки.
 */
const CHEVRON_CLICK_ZONE = 28;

const DEFAULT_NAV_STATE_KEY = 'kbs-ui-nav';

/**
 * Правило, которое подгоняет ЛЮБОЙ вложенный SVG под font-size
 * обёртки. Переопределяет presentation-атрибуты width/height у <svg>.
 */
const NAV_ICON_CSS = `
  .kbs-nav-icon svg {
    width: 1em;
    height: 1em;
    display: block;
    flex-shrink: 0;
  }
`;

/* ──────────────────────────────────────────────────────────── */
/*  NavIcon                                                    */
/* ──────────────────────────────────────────────────────────── */

/**
 * Слот для иконки навигации. Унифицирует рендер эмодзи, текстовых
 * символов, SVG и React-компонентов:
 *   - для текста/эмодзи работает fontSize;
 *   - для SVG — CSS заставляет svg принять размер 1em × 1em,
 *     независимо от его собственных width/height атрибутов.
 */
export function NavIcon({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className="kbs-nav-icon"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        flexShrink: 0,
        color: 'inherit',
      }}
    >
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Хелперы                                                    */
/* ──────────────────────────────────────────────────────────── */

const filterChildren = (tab: NavTab, isLoggedIn: boolean): NavTabChild[] =>
  (tab.children ?? []).filter((c) => (c.visible ? c.visible(isLoggedIn) : true));

/**
 * Определяет, что показывать в родительской кнопке и куда ведёт main-клик.
 * В режиме 'replace' берём активного ребёнка, иначе — ранее выбранного.
 * Родитель остаётся fallback'ом на случай пустого хранилища.
 */
function resolveDisplay(
  tab: NavTab,
  children: NavTabChild[],
  activeTab: string,
  lastSelectedChildId: string | undefined
) {
  const activeChild = children.find((c) => c.id === activeTab);
  const storedChild = lastSelectedChildId
    ? children.find((c) => c.id === lastSelectedChildId)
    : undefined;

  const displayChild = activeChild ?? storedChild;
  const useReplace = tab.displayMode === 'replace';

  return {
    label: useReplace && displayChild ? displayChild.label : tab.label,
    icon: useReplace && displayChild ? displayChild.icon ?? tab.icon : tab.icon,
    targetChildId: displayChild?.id,
  };
}

/** Куда ведёт main-клик: последний выбранный ребёнок → первый ребёнок → родитель. */
function resolveMainTarget(
  tab: NavTab,
  children: NavTabChild[],
  targetChildId?: string
): string {
  if (targetChildId) return targetChildId;
  if (children.length > 0) return children[0].id;
  return tab.id;
}

/** Определяет, попал ли клик в правую chevron-зону кнопки. */
function isChevronClick(e: React.MouseEvent<HTMLElement>): boolean {
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientX > rect.right - CHEVRON_CLICK_ZONE;
}

/* ──────────────────────────────────────────────────────────── */
/*  usePersistedNavState                                       */
/* ──────────────────────────────────────────────────────────── */

interface PersistedNavState {
  lastSelectedChild: Record<string, string>;
  setLastSelectedChild: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function usePersistedNavState(
  storageKey: string,
  activeTab: string,
  navTabs: NavTab[]
): PersistedNavState {
  const lastKey = `${storageKey}:last`;
  const expandedKey = `${storageKey}:expanded`;

  const [lastSelectedChild, setLastSelectedChild] = useState<Record<string, string>>(() => {
    try {
      const raw = sessionStorage.getItem(lastKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(expandedKey);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem(lastKey, JSON.stringify(lastSelectedChild)); } catch { /* ignore */ }
  }, [lastKey, lastSelectedChild]);

  useEffect(() => {
    try { sessionStorage.setItem(expandedKey, JSON.stringify([...expandedIds])); } catch { /* ignore */ }
  }, [expandedKey, expandedIds]);

  // Синхронизация lastSelectedChild с activeTab. Никогда не удаляет записи.
  useEffect(() => {
    setLastSelectedChild((prev) => {
      let next: Record<string, string> | null = null;
      for (const tab of navTabs) {
        if (!tab.children) continue;
        const child = tab.children.find((c) => c.id === activeTab);
        if (child && prev[tab.id] !== child.id) {
          if (!next) next = { ...prev };
          next[tab.id] = child.id;
        }
      }
      return next ?? prev;
    });
  }, [activeTab, navTabs]);

  return { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds };
}

/* ──────────────────────────────────────────────────────────── */
/*  MoscowTimeWidget                                           */
/* ──────────────────────────────────────────────────────────── */

function MoscowTimeWidget({ t, stacked = false }: { t: Theme; stacked?: boolean }) {
  const [time, setTime] = useState({ hours: '00', minutes: '00' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hours = parts.find(p => p.type === 'hour')?.value || '00';
      const minutes = parts.find(p => p.type === 'minute')?.value || '00';
      setTime({ hours, minutes });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (stacked) {
    return (
      <>
        <style>{`
          .moscow-time-stacked {
            font-family: 'TT Octosquares', monospace !important;
            font-size: 46px !important;
            font-weight: 500;
            color: ${t.textMuted};
            letter-spacing: 0.02em;
            user-select: none;
            line-height: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .moscow-time-stacked .hours { font-size: inherit; line-height: 1; }
          .moscow-time-stacked .minutes { font-size: inherit; line-height: 1; margin-top: -2px; }
        `}</style>
        <div className="moscow-time-stacked">
          <span className="hours">{time.hours}</span>
          <span className="minutes">{time.minutes}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .moscow-time-widget {
          font-family: 'TT Octosquares', monospace !important;
          font-size: 46px !important;
          font-weight: 500;
          color: ${t.textMuted};
          letter-spacing: 0.02em;
          user-select: none;
          line-height: 1.2;
        }
      `}</style>
      <span className="moscow-time-widget">{time.hours}:{time.minutes}</span>
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  ChangePasswordModal                                        */
/* ──────────────────────────────────────────────────────────── */

interface ChangePasswordModalProps {
  t: Theme;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void> | void;
}

function ChangePasswordModal({ t, isOpen, onClose, onSubmit }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldError, setOldError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOldError('');
      setNewError('');
      setConfirmError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setOldError('');
    setNewError('');
    setConfirmError('');

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

  const fields = [
    {
      row: 0, col: 0, required: true,
      content: (
        <PasswordInput
          label="Старый пароль"
          theme={t}
          value={oldPassword}
          onChange={setOldPassword}
          error={oldError || undefined}
          disabled={submitting}
          showStrength={false}
        />
      ),
    },
    {
      row: 1, col: 0, required: true,
      content: (
        <PasswordInput
          label="Новый пароль"
          theme={t}
          value={newPassword}
          onChange={setNewPassword}
          showStrength
          error={newError || undefined}
          disabled={submitting}
        />
      ),
    },
    {
      row: 2, col: 0, required: true,
      content: (
        <PasswordInput
          label="Новый пароль (подтверждение)"
          theme={t}
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={confirmError || undefined}
          disabled={submitting}
        />
      ),
    },
  ];

  return (
    <Modal
      theme={t}
      isOpen={isOpen}
      onClose={onClose}
      onOk={handleSubmit}
      title="Смена пароля"
      columns={1}
      rows={3}
      fields={fields}
      okText={submitting ? 'Смена…' : 'Сменить'}
      cancelText="Отмена"
      width={420}
      canSubmit={!submitting && !!oldPassword && !!newPassword && !!confirmPassword}
    />
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  HorizontalHeader                                            */
/* ──────────────────────────────────────────────────────────── */

export function HorizontalHeader({
  t,
  activeTab,
  onTabChange,
  isLoggedIn,
  onSignIn,
  onSignOut,
  userName,
  navTabs,
  siteName = 'Nexus',
  logoSvg = '◈',
  showProfile = true,
  showSettings = true,
  showLayoutToggle = false,
  showThemeSwitcher = false,
  layoutMode,
  onLayoutChange,
  currentTheme,
  onThemeChange,
  showMoscowTime = false,
  onPasswordChange,
  navStateKey = DEFAULT_NAV_STATE_KEY,
}: HeaderBaseProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { lastSelectedChild, setLastSelectedChild } = usePersistedNavState(
    navStateKey,
    activeTab,
    navTabs
  );

  const dropRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visibleTabs = navTabs.filter((tab) =>
    tab.visible ? tab.visible(isLoggedIn) : true
  );

  const menuItems: [string, boolean][] = [];
  if (showProfile) menuItems.push(['◈ Профиль', false]);
  if (showSettings) menuItems.push(['⚙ Настройки', false]);
  if (onPasswordChange) menuItems.push(['🕵︎ Сменить пароль', false]);
  menuItems.push(['— Выйти', true]);

  const handleMenuClick = (label: string) => {
    if (label.includes('Выйти')) {
      onSignOut();
    } else if (label.includes('Сменить пароль')) {
      setDropOpen(false);
      setPwdModalOpen(true);
    }
  };

  return (
    <>
      <style>{NAV_ICON_CSS}</style>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: t.bgSurface, borderBottom: `1px solid ${t.border}`, boxShadow: t.shadow, position: 'sticky', top: 0, zIndex: 100, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: t.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui', boxShadow: `0 0 16px ${t.accentGlow}` }}>
            {logoSvg}
          </div>
          <span style={{ fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.01em' }}>
            {siteName}
          </span>
        </div>

        <nav ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
          {visibleTabs.map((tab) => {
            const children = filterChildren(tab, isLoggedIn);
            const hasChildren = children.length > 0;
            const activeChild = hasChildren ? children.find((c) => c.id === activeTab) : undefined;
            const active = activeTab === tab.id || !!activeChild;
            const isOpen = openMenuId === tab.id;

            const { label: displayLabel, icon: displayIcon, targetChildId } =
              resolveDisplay(tab, children, activeTab, lastSelectedChild[tab.id]);

            const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
              if (!hasChildren) {
                onTabChange(tab.id);
                return;
              }
              if (isChevronClick(e)) {
                setOpenMenuId((prev) => (prev === tab.id ? null : tab.id));
                return;
              }
              const target = resolveMainTarget(tab, children, targetChildId);
              setLastSelectedChild((prev) => ({ ...prev, [tab.id]: target }));
              setOpenMenuId(null);
              onTabChange(target);
            };

            return (
              <div key={tab.id} style={{ position: 'relative' }}>
                <button
                  onClick={handleClick}
                  aria-haspopup={hasChildren || undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontSize: 13.5, fontFamily: 'system-ui',
                    fontWeight: active ? 600 : 400,
                    color: active ? t.accentText : t.textMuted,
                    background: active ? t.accent : 'transparent',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                    whiteSpace: 'nowrap',
                    boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none',
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
                >
                  <NavIcon size={15}>{displayIcon}</NavIcon>
                  <span>{displayLabel}</span>
                  {hasChildren && (
                    <span
                      aria-hidden
                      style={{
                        fontSize: 9, lineHeight: 1, marginLeft: 2, opacity: 0.75,
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        display: 'inline-block',
                      }}
                    >▾</span>
                  )}
                </button>

                {hasChildren && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: '50%',
                      transform: isOpen
                        ? 'translateX(-50%) translateY(0)'
                        : 'translateX(-50%) translateY(-6px)',
                      background: t.bgSurface,
                      border: `1px solid ${t.border}`,
                      borderRadius: 10,
                      padding: 6,
                      minWidth: 180,
                      boxShadow: t.shadowLg,
                      opacity: isOpen ? 1 : 0,
                      pointerEvents: isOpen ? 'all' : 'none',
                      transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1)',
                      zIndex: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {children.map((child) => {
                      const childActive = activeTab === child.id;
                      return (
                        <button
                          key={child.id}
                          role="menuitem"
                          onClick={() => {
                            setLastSelectedChild((prev) => ({ ...prev, [tab.id]: child.id }));
                            onTabChange(child.id);
                            setOpenMenuId(null);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 7, border: 'none',
                            background: childActive ? t.selectedBg : 'transparent',
                            color: childActive ? t.accent : t.text,
                            cursor: 'pointer', fontSize: 13,
                            fontFamily: 'system-ui', textAlign: 'left',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!childActive) e.currentTarget.style.background = t.navHoverBg; }}
                          onMouseLeave={(e) => { if (!childActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {child.icon && <NavIcon size={15}>{child.icon}</NavIcon>}
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {showLayoutToggle && layoutMode && onLayoutChange && (
            <LayoutToggle mode={layoutMode} onChange={onLayoutChange} theme={t} />
          )}
          {showThemeSwitcher && currentTheme && onThemeChange && (
            <ThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} compact />
          )}
          {showMoscowTime && <MoscowTimeWidget t={t} stacked={false} />}
          {isLoggedIn ? (
            <div style={{ position: 'relative' }} ref={dropRef}>
              <button
                onClick={() => setDropOpen(p => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 12px 5px 6px',
                  borderRadius: 24,
                  border: `1px solid ${t.border}`,
                  background: t.bgSurface,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: dropOpen ? `0 0 0 2px ${t.accentGlow}` : 'none'
                }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: t.accentText,
                  fontWeight: 700,
                  fontFamily: 'system-ui'
                }}>{userName?.[0]?.toUpperCase()}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.text,
                    fontFamily: 'system-ui',
                    lineHeight: 1.2
                  }}>{userName}</div>
                </div>
                <span style={{
                  color: t.textMuted,
                  fontSize: 10,
                  transition: 'transform 0.2s',
                  transform: dropOpen ? 'rotate(180deg)' : 'none',
                  display: 'flex'
                }}>▾</span>
              </button>
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: t.bgSurface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: '6px',
                  minWidth: 180,
                  boxShadow: t.shadowLg,
                  opacity: dropOpen ? 1 : 0,
                  transform: dropOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
                  pointerEvents: dropOpen ? 'all' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  zIndex: 200
                }}>
                {menuItems.map(([label, danger]) => (
                  <button
                    key={String(label)}
                    onClick={() => handleMenuClick(String(label))}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'system-ui', color: danger ? t.danger : t.text, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = danger ? `${t.danger}18` : t.navHoverBg; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {String(label)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background: t.accent,
                color: t.accentText,
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'system-ui',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                boxShadow: `0 2px 16px ${t.accentGlow}`
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <IcoLogIn s={15}/> Войти
            </button>
          )}
        </div>
      </header>

      {onPasswordChange && (
        <ChangePasswordModal
          t={t}
          isOpen={pwdModalOpen}
          onClose={() => setPwdModalOpen(false)}
          onSubmit={onPasswordChange}
        />
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  VerticalHeader                                              */
/* ──────────────────────────────────────────────────────────── */

const VERTICAL_MIN_WIDTH = 200;
const VERTICAL_EXPANDED_WIDTH = 220;
const VERTICAL_COLLAPSED_WIDTH = 64;

export function VerticalHeader({
  t,
  activeTab,
  onTabChange,
  isLoggedIn,
  onSignIn,
  onSignOut,
  userName,
  navTabs,
  siteName = 'Nexus',
  logoSvg = '◈',
  showLayoutToggle = false,
  showThemeSwitcher = false,
  layoutMode,
  onLayoutChange,
  currentTheme,
  onThemeChange,
  showMoscowTime = false,
  navStateKey = DEFAULT_NAV_STATE_KEY,
}: HeaderBaseProps) {
  const collapsedKey = `${navStateKey}:collapsed`;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(collapsedKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(collapsedKey, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsedKey, collapsed]);

  const { lastSelectedChild, setLastSelectedChild, expandedIds, setExpandedIds } =
    usePersistedNavState(navStateKey, activeTab, navTabs);

  const userClosedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    userClosedRef.current = new Set();
  }, [activeTab]);

  useEffect(() => {
    setExpandedIds((prev) => {
      let next: Set<string> | null = null;
      for (const tab of navTabs) {
        if (!tab.children) continue;
        if (userClosedRef.current.has(tab.id)) continue;
        if (tab.children.some((c) => c.id === activeTab) && !prev.has(tab.id)) {
          if (!next) next = new Set(prev);
          next.add(tab.id);
        }
      }
      return next ?? prev;
    });
  }, [activeTab, navTabs, setExpandedIds]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        userClosedRef.current.add(id);
      } else {
        next.add(id);
        userClosedRef.current.delete(id);
      }
      return next;
    });
  };

  const w = collapsed ? VERTICAL_COLLAPSED_WIDTH : VERTICAL_EXPANDED_WIDTH;

  const visibleTabs = navTabs.filter((tab) =>
    tab.visible ? tab.visible(isLoggedIn) : true
  );

  return (
    <>
      <style>{NAV_ICON_CSS}</style>

      <aside
        style={{
          width: w,
          minWidth: collapsed ? VERTICAL_COLLAPSED_WIDTH : VERTICAL_MIN_WIDTH,
          height: '100%',
          background: t.bgSurface,
          borderRight: `1px solid ${t.border}`,
          boxShadow: t.shadow,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '18px 0' : '16px 16px 16px 18px',
          borderBottom: `1px solid ${t.borderSubtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, overflow: 'hidden' }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: t.accent,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: t.accentText,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: `0 0 16px ${t.accentGlow}`
              }}>
              {logoSvg}
            </div>
            <span
              style={{
                fontFamily: 'system-ui',
                fontWeight: 700,
                fontSize: 15,
                color: t.text,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : 120,
                transition: 'opacity 0.2s, max-width 0.32s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden'
              }}>
              {siteName}
            </span>
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: t.textMuted,
                display: 'flex',
                padding: 4,
                borderRadius: 6,
                transition: 'all 0.15s',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = t.navHoverBg;
                e.currentTarget.style.color = t.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = t.textMuted;
              }}>
              <IcoChevronLeft s={16}/>
            </button>
          )}
        </div>

        <nav
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {collapsed && (
            <button onClick={() => setCollapsed(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, marginBottom: 6, borderRadius: 8, border: 'none', background: 'transparent', color: t.textMuted, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}>
              <IcoChevronRight s={16} />
            </button>
          )}

          {visibleTabs.map((tab) => {
            const children = filterChildren(tab, isLoggedIn);
            const hasChildren = children.length > 0;
            const activeChild = hasChildren ? children.find((c) => c.id === activeTab) : undefined;
            const active = activeTab === tab.id || !!activeChild;
            const expanded = expandedIds.has(tab.id);

            const { label: displayLabel, icon: displayIcon, targetChildId } =
              resolveDisplay(tab, children, activeTab, lastSelectedChild[tab.id]);

            const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
              if (collapsed) {
                if (hasChildren) {
                  const target = resolveMainTarget(tab, children, targetChildId);
                  setLastSelectedChild((prev) => ({ ...prev, [tab.id]: target }));
                  onTabChange(target);
                } else {
                  onTabChange(tab.id);
                }
                return;
              }
              if (!hasChildren) {
                onTabChange(tab.id);
                return;
              }
              if (isChevronClick(e)) {
                toggleExpanded(tab.id);
                return;
              }
              if (!expanded) {
                setExpandedIds((prev) => new Set([...prev, tab.id]));
                return;
              }
              const target = resolveMainTarget(tab, children, targetChildId);
              onTabChange(target);
            };

            return (
              <div key={tab.id}>
                <button
                  onClick={handleClick}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '8px' : '9px 12px',
                    borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 13.5, fontFamily: 'system-ui',
                    fontWeight: active ? 600 : 400,
                    color: active ? t.accentText : t.textMuted,
                    background: active ? t.accent : 'transparent',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
                >
                  <NavIcon size={17}>{displayIcon}</NavIcon>
                  {!collapsed && (
                    <span style={{
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      textAlign: 'left',
                    }}>{displayLabel}</span>
                  )}
                  {hasChildren && !collapsed && (
                    <span
                      aria-hidden
                      style={{
                        display: 'flex', flexShrink: 0, color: 'inherit',
                        transform: expanded ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                        opacity: 0.85,
                      }}
                    >
                      <IcoChevronRight s={12} />
                    </span>
                  )}
                </button>

                {hasChildren && expanded && !collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 22, marginTop: 2, marginBottom: 4 }}>
                    {children.map((child) => {
                      const childActive = activeTab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            setLastSelectedChild((prev) => ({ ...prev, [tab.id]: child.id }));
                            onTabChange(child.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 10px', borderRadius: 7, border: 'none',
                            cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui',
                            fontWeight: childActive ? 600 : 400,
                            color: childActive ? t.accent : t.textMuted,
                            background: childActive ? t.selectedBg : 'transparent',
                            textAlign: 'left', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            transition: 'all 0.15s',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => { if (!childActive) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }}
                          onMouseLeave={(e) => { if (!childActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
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

        {!collapsed && (showLayoutToggle || showThemeSwitcher) && (
          <div style={{ padding: '8px', borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
            {showLayoutToggle && layoutMode && onLayoutChange && (
              <LayoutToggle mode={layoutMode} onChange={onLayoutChange} theme={t} />
            )}
            {showThemeSwitcher && currentTheme && onThemeChange && (
              <ThemeSwitcher theme={currentTheme} onChange={onThemeChange} t={t} compact />
            )}
          </div>
        )}

        <div style={{ padding: '8px', borderTop: `1px solid ${t.borderSubtle}`, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {showMoscowTime && <MoscowTimeWidget t={t} stacked={collapsed} />}
          {isLoggedIn ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '8px' : '8px 10px',
                borderRadius: 9,
                border: `1px solid ${t.border}`,
                background: t.bgSurface,
                overflow: 'hidden',
                width: '90%'
              }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: t.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: t.accentText,
                  fontWeight: 700,
                  fontFamily: 'system-ui',
                  flexShrink: 0
                }}>{userName?.[0]?.toUpperCase()}</div>
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : 'auto',
                  transition: 'opacity 0.18s'
                }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.text,
                    fontFamily: 'system-ui',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{userName}</div>
              </div>
              {!collapsed && (
                <button
                  onClick={onSignOut}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: t.textMuted,
                    display: 'flex',
                    padding: 4,
                    borderRadius: 6,
                    flexShrink: 0,
                    transition: 'color 0.15s'
                  }}
                  title="Выйти"
                  onMouseEnter={e => e.currentTarget.style.color = t.danger}
                  onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>
                  <IcoLogOut s={15}/>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 8,
                justifyContent: 'center',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 9,
                border: 'none',
                background: t.accent,
                color: t.accentText,
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'system-ui',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                boxShadow: `0 2px 16px ${t.accentGlow}`,
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <IcoLogIn s={15}/>
              <span style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                transition: 'opacity 0.18s',
                overflow: 'hidden'
              }}>Войти</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}