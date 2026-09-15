import React, { useState } from 'react';
import type { Theme, ThemeName } from '../themes/theme';
import { themes } from '../themes/theme';
import { IcoLogIn, IcoLogOut, IcoX } from './icons';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ThemeSwitcher } from './ThemeSwitcher';

export interface MobileNavTab {
  id: string;
  label: string;
  icon: string;
  visible?: (isLoggedIn: boolean) => boolean;
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
  logoSvg?: React.ReactNode;
  currentTheme?: ThemeName;
  onThemeChange?: (t: ThemeName) => void;
  showThemeSwitcher?: boolean;
}

export function MobileHeader({
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
  currentTheme,
  onThemeChange,
  showThemeSwitcher = false,
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);

  const visibleTabs = navTabs.filter((tab) =>
    tab.visible ? tab.visible(isLoggedIn) : true
  );

  const go = (id: string) => {
    onTabChange(id);
    setOpen(false);
  };

  const touchTarget = 48;

  return (
    <>
      {/* ── Верхняя панель ─────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
          background: t.bgSurface,
          borderBottom: `1px solid ${t.border}`,
          color: t.text,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          minHeight: 56,
        }}
      >
        <button
          type="button"
          aria-label="Открыть меню"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: t.text,
            fontSize: 22,
            lineHeight: 1,
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            minHeight: 44,
            borderRadius: 8,
          }}
        >
          ☰
        </button>

        <div
          style={{
            width: 30,
            height: 30,
            background: t.accent,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            color: t.accentText,
            fontWeight: 700,
            boxShadow: `0 0 14px ${t.accentGlow}`,
            flexShrink: 0,
          }}
        >
          {logoSvg}
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {siteName}
        </div>
      </header>

      {/* ── Drawer ─────────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            animation: 'kbs-fade-in 0.2s ease',
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '82%',
              maxWidth: 340,
              background: t.bgSurface,
              color: t.text,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: t.shadowLg,
              animation: 'kbs-slide-in 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* Шапка drawer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: `1px solid ${t.border}`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    background: t.accent,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    color: t.accentText,
                    fontWeight: 700,
                  }}
                >
                  {logoSvg}
                </div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{siteName}</span>
              </div>
              <button
                type="button"
                aria-label="Закрыть меню"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: t.iconColor,
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 8,
                }}
              >
                <IcoX s={18} />
              </button>
            </div>

            {/* Навигация */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {visibleTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => go(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      minHeight: touchTarget,
                      padding: '12px 16px',
                      marginBottom: 4,
                      background: active ? t.accent : 'transparent',
                      color: active ? t.accentText : t.text,
                      border: 'none',
                      borderRadius: 10,
                      textAlign: 'left',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Переключатель темы */}
            {showThemeSwitcher && currentTheme && onThemeChange && (
              <div
                style={{
                  padding: 14,
                  borderTop: `1px solid ${t.border}`,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  Тема
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ThemeSwitcher
                    theme={currentTheme}
                    onChange={onThemeChange}
                    t={t}
                    compact
                  />
                </div>
              </div>
            )}

            {/* Логин/логаут */}
            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${t.border}`,
                flexShrink: 0,
              }}
            >
              {isLoggedIn ? (
                <>
                  <div
                    style={{
                      fontSize: 14,
                      color: t.textMuted,
                      marginBottom: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {userName}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSignOut();
                    }}
                    style={{
                      width: '100%',
                      minHeight: touchTarget,
                      padding: '12px 16px',
                      background: t.danger,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <IcoLogOut s={16} /> Выйти
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSignIn();
                  }}
                  style={{
                    width: '100%',
                    minHeight: touchTarget,
                    padding: '12px 16px',
                    background: t.accent,
                    color: t.accentText,
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: `0 2px 16px ${t.accentGlow}`,
                  }}
                >
                  <IcoLogIn s={16} /> Войти
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes kbs-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes kbs-slide-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}