import React, { useInsertionEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HorizontalHeader, VerticalHeader } from './header/Header';
import { themes, type Theme, type ThemeName } from '../themes/theme';
import type { LayoutMode } from './header/LayoutToggle';
import { useAuthActions } from '../hooks/useAuthActions';
import { useResponsive } from '../context/ResponsiveContext';
import { filterNavTabs, matchActiveTab, type NavTab, type NavUser } from './Nav';

type HeaderProps = React.ComponentProps<typeof HorizontalHeader>;

export interface FooterConfig {
  email?: string;
  authorName?: string;
  brand?: string;
  orgName?: string;
  subject?: string;
}

export interface PageLayoutProps<TUser extends NavUser = NavUser> {
  siteName: string;
  logo?: React.ReactNode;
  user: (TUser & { name?: string }) | null;
  tabs: readonly NavTab<TUser>[];
  guestTabs?: boolean;
  onSignOut: () => Promise<void> | void;
  theme: ThemeName;
  onThemeChange: (t: ThemeName) => void;
  layout: LayoutMode;
  onLayoutChange: (l: LayoutMode) => void;
  title?: string;
  actions?: React.ReactNode;
  padding?: string;
  paddingBottom?: string;
  scrollMode?: 'content' | 'inner';
  onProfileClick?: () => void;
  headerProps?: Partial<HeaderProps>;
  footer?: FooterConfig | false;
  children: React.ReactNode;
}

/* Hover/фокус футера — без внешних CSS-файлов. */
const FOOTER_CSS_ID = 'kbs-page-layout-css';
const FOOTER_CSS = `
.kbs-footer-link { transition: color .15s ease, border-bottom-color .15s ease; }
@media (hover: hover) {
  .kbs-footer:hover { opacity: 1; }
  .kbs-footer-link:hover {
    color: var(--kbs-footer-accent);
    border-bottom-color: var(--kbs-footer-accent);
  }
}
.kbs-footer-link:focus-visible,
.kbs-footer-link:active {
  color: var(--kbs-footer-accent);
  border-bottom-color: var(--kbs-footer-accent);
  outline: none;
}
@media (prefers-reduced-motion: reduce) {
  .kbs-footer, .kbs-footer-link { transition: none !important; }
}
`;

function useStyleTag(id: string, css: string) {
  useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

const colorScheme = (bg: string): 'light' | 'dark' => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(bg).trim());
  if (!m) return 'light';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const lum =
    (0.2126 * parseInt(h.slice(0, 2), 16) +
      0.7152 * parseInt(h.slice(2, 4), 16) +
      0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
  return lum < 0.5 ? 'dark' : 'light';
};

const CreatorFooter = ({ siteName, theme, config }: {
  siteName: string; theme: Theme; config: FooterConfig;
}) => {
  const {
    email = 'Dmitriy.Savelyev@agr.auto',
    authorName = 'Савельев Дмитрий',
    brand = 'KBS',
    orgName = 'АГР Тех',
    subject,
  } = config;
  const mailSubject = subject ?? `Баг/Предложение по модификации. ${siteName}`;
  const sep = <span style={{ margin: '0 6px' }}>·</span>;
  return (
    <footer
      className="kbs-footer"
      style={{
        flexShrink: 0, paddingTop: 4,
        borderTop: `1px solid ${theme.borderSubtle}`,
        textAlign: 'center', fontSize: 11, letterSpacing: '0.02em',
        color: theme.textMuted, opacity: 0.6,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'text', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        transition: 'opacity .15s ease',
        '--kbs-footer-accent': theme.accent,
      } as React.CSSProperties}
    >
      <span style={{ fontWeight: 600, color: theme.text, opacity: 0.9 }}>{brand}</span>
      {sep}<span>{orgName}</span>{sep}
      <a
        className="kbs-footer-link"
        href={`mailto:${email}?subject=${encodeURIComponent(mailSubject)}`}
        title={`Написать письмо: ${email}`}
        style={{
          color: 'inherit', textDecoration: 'none', cursor: 'pointer',
          borderBottom: '1px dotted transparent', touchAction: 'manipulation',
        }}
      >
        {authorName}
      </a>
      {sep}<span>© {new Date().getFullYear()}</span>
    </footer>
  );
};

export function PageLayout<TUser extends NavUser = NavUser>({
  siteName, logo, user, tabs, guestTabs = false, onSignOut,
  theme, onThemeChange, layout, onLayoutChange,
  title, actions, padding, paddingBottom,
  scrollMode = 'content', onProfileClick, headerProps, footer, children,
}: PageLayoutProps<TUser>) {
  useStyleTag(FOOTER_CSS_ID, FOOTER_CSS);
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { handleSignIn, handleSignOut } = useAuthActions({ logout: onSignOut, navigate });

  const effectiveLayout: LayoutMode = isMobile ? 'horizontal' : layout;
  const t = themes[theme];
  const navTabs = useMemo(() => filterNavTabs(tabs, user, { guestTabs }), [tabs, user, guestTabs]);
  const activeTab = matchActiveTab(location.pathname, navTabs);
  const HeaderComponent = effectiveLayout === 'vertical' ? VerticalHeader : HorizontalHeader;
  const showHeaderBlock = Boolean(title) || Boolean(actions);

  return (
    <div
      className="kbs-shell"
      style={{
        height: '100dvh', overflow: 'hidden', display: 'flex',
        flexDirection: effectiveLayout === 'vertical' ? 'row' : 'column',
        background: t.bg, color: t.text, colorScheme: colorScheme(t.bg),
      }}
    >
      <HeaderComponent
        t={t}
        activeTab={activeTab}
        onTabChange={navigate}
        isLoggedIn={!!user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        userName={user?.name}
        navTabs={navTabs}
        siteName={siteName}
        logoSvg={logo}
        onProfileClick={onProfileClick}
        showSettings={false}
        showMoscowTime
        showLayoutToggle={!isMobile}
        showThemeSwitcher
        layoutMode={effectiveLayout}
        onLayoutChange={onLayoutChange}
        currentTheme={theme}
        onThemeChange={onThemeChange}
        {...headerProps}
      />
      <div
        className="kbs-content"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          minHeight: 0, minWidth: 0, boxSizing: 'border-box',
          padding: padding ?? 'clamp(12px, 3vw, 24px)',
          paddingBottom: paddingBottom ?? 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        }}
      >
        {showHeaderBlock && (
          <div
            className="kbs-page-head"
            style={{
              flexShrink: 0, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8,
            }}
          >
            {title && (
              <h2 className="kbs-page-title" style={{ margin: 0, color: t.text, fontSize: 'clamp(18px, 2.5vw, 24px)' }}>
                {title}
              </h2>
            )}
            {actions && <div className="kbs-page-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
          </div>
        )}
        {/* inner: страницы скроллятся сами — контейнер НЕ.clipует
            всплывающие label и focus-тени полей. */}
        <div
          className="kbs-scroll"
          style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            overflow: scrollMode === 'content' ? 'auto' : 'visible',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>
        {footer !== false && <CreatorFooter siteName={siteName} theme={t} config={footer ?? {}} />}
      </div>
    </div>
  );
}