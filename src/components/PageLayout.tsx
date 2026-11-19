// PageLayout.tsx — каркас страницы: Header + заголовок + контент + футер.
import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header, type HeaderProps, type LayoutMode } from './Header';
import { colorScheme, themes, type Theme, type ThemeName } from '../themes/theme';
import { useResponsive } from '../context/AppContext';
import { useStyleTag } from '../hooks';
import { filterNavTabs, matchActiveTab, type NavTab, type NavUser } from './Nav';

/** Подпись автора в футере. */
export interface FooterConfig {
  email?: string;
  authorName?: string;
  brand?: string;
  orgName?: string;
  subject?: string;
}

export interface PageLayoutProps<TUser extends NavUser = NavUser> {
  /** Название сайта. */
  siteName: string;
  /** Логотип. */
  logo?: React.ReactNode;
  /** Текущий пользователь (null — гость). */
  user: (TUser & { name?: string }) | null;
  /** Навигация с правилами видимости. */
  tabs: readonly NavTab<TUser>[];
  /** Показывать навигацию гостям. */
  guestTabs?: boolean;
  /** Логаут. */
  onSignOut: () => Promise<void> | void;
  /** Активная тема. */
  theme: ThemeName;
  /** Смена темы. */
  onThemeChange: (t: ThemeName) => void;
  /** Раскладка шапки (десктоп). */
  layout: LayoutMode;
  /** Смена раскладки. */
  onLayoutChange: (l: LayoutMode) => void;
  /** Заголовок страницы. */
  title?: string;
  /** Действия справа от заголовка. */
  actions?: React.ReactNode;
  /** Padding контентной области. */
  padding?: string;
  /** Нижний padding контентной области. */
  paddingBottom?: string;
  /** 'content' — скроллится контент; 'inner' — страницы скроллятся сами. @default 'content' */
  scrollMode?: 'content' | 'inner';
  /** Клик «Профиль». */
  onProfileClick?: () => void;
  /** Проброс пропсов в Header. */
  headerProps?: Partial<HeaderProps>;
  /** Футер: конфиг или false. */
  footer?: FooterConfig | false;
  /** Содержимое страницы. */
  children: React.ReactNode;
}

const FOOTER_CSS = `
.kbs-footer-link { transition: color .15s ease, border-bottom-color .15s ease; }
@media (hover: hover) {
  .kbs-footer:hover { opacity: 1; }
  .kbs-footer-link:hover { color: var(--kbs-footer-accent); border-bottom-color: var(--kbs-footer-accent); }
}
.kbs-footer-link:focus-visible, .kbs-footer-link:active {
  color: var(--kbs-footer-accent); border-bottom-color: var(--kbs-footer-accent); outline: none;
}
@media (prefers-reduced-motion: reduce) { .kbs-footer, .kbs-footer-link { transition: none !important; } }
`;

const CreatorFooter = ({ siteName, theme, config }: { siteName: string; theme: Theme; config: FooterConfig }) => {
  const {
    email = 'Dmitriy.Savelyev@agr.auto', authorName = 'Савельев Дмитрий',
    brand = 'KBS', orgName = 'АГР Тех', subject,
  } = config;
  const mailSubject = subject ?? `Баг/Предложение по модификации. ${siteName}`;
  const sep = <span style={{ margin: '0 6px' }}>·</span>;
  return (
    <footer className="kbs-footer" style={{
      flexShrink: 0, paddingTop: 4, borderTop: `1px solid ${theme.borderSubtle}`,
      textAlign: 'center', fontSize: 11, letterSpacing: '0.02em',
      color: theme.textMuted, opacity: 0.6, fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      transition: 'opacity .15s ease', '--kbs-footer-accent': theme.accent,
    } as React.CSSProperties}>
      <span style={{ fontWeight: 600, color: theme.text, opacity: 0.9 }}>{brand}</span>
      {sep}<span>{orgName}</span>{sep}
      <a className="kbs-footer-link"
        href={`mailto:${email}?subject=${encodeURIComponent(mailSubject)}`}
        title={`Написать письмо: ${email}`}
        style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dotted transparent', touchAction: 'manipulation' }}>
        {authorName}
      </a>
      {sep}<span>© {new Date().getFullYear()}</span>
    </footer>
  );
};

/** Каркас страницы с адаптивной шапкой, скроллом и футером. */
export function PageLayout<TUser extends NavUser = NavUser>({
  siteName, logo, user, tabs, guestTabs = false, onSignOut,
  theme, onThemeChange, layout, onLayoutChange,
  title, actions, padding, paddingBottom,
  scrollMode = 'content', onProfileClick, headerProps, footer, children,
}: PageLayoutProps<TUser>) {
  useStyleTag('kbs-page-layout-css', FOOTER_CSS);
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();

  const handleSignIn = useCallback(() => navigate('/login'), [navigate]);
  const handleSignOut = useCallback(async () => { await onSignOut(); navigate('/login'); }, [onSignOut, navigate]);

  const effectiveLayout: LayoutMode = isMobile ? 'horizontal' : layout;
  const t = themes[theme];
  const navTabs = useMemo(() => filterNavTabs(tabs, user, { guestTabs }), [tabs, user, guestTabs]);
  const activeTab = matchActiveTab(location.pathname, navTabs);
  const showHeaderBlock = Boolean(title) || Boolean(actions);

  return (
    <div className="kbs-shell" style={{
      height: '100dvh', overflow: 'hidden', display: 'flex',
      flexDirection: effectiveLayout === 'vertical' ? 'row' : 'column',
      background: t.bg, color: t.text, colorScheme: colorScheme(t.bg),
    }}>
      <Header
        t={t} layout={effectiveLayout}
        activeTab={activeTab} onTabChange={navigate}
        isLoggedIn={!!user} onSignIn={handleSignIn} onSignOut={handleSignOut}
        userName={user?.name} navTabs={navTabs}
        siteName={siteName} logoSvg={logo}
        onProfileClick={onProfileClick} showSettings={false}
        showMoscowTime showLayoutToggle={!isMobile} showThemeSwitcher
        onLayoutChange={onLayoutChange}
        currentTheme={theme} onThemeChange={onThemeChange}
        {...headerProps}
      />
      <div className="kbs-content" style={{
        flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, boxSizing: 'border-box',
        padding: padding ?? 'clamp(12px, 3vw, 24px)',
        paddingBottom: paddingBottom ?? 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}>
        {showHeaderBlock && (
          <div className="kbs-page-head" style={{
            flexShrink: 0, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8,
          }}>
            {title && (
              <h2 className="kbs-page-title" style={{ margin: 0, color: t.text, fontSize: 'clamp(18px, 2.5vw, 24px)' }}>{title}</h2>
            )}
            {actions && <div className="kbs-page-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
          </div>
        )}
        <div className="kbs-scroll" style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          overflow: scrollMode === 'content' ? 'auto' : 'visible', overscrollBehavior: 'contain',
        }}>
          {children}
        </div>
        {footer !== false && <CreatorFooter siteName={siteName} theme={t} config={footer ?? {}} />}
      </div>
    </div>
  );
}