// Menu.tsx — простое вертикальное меню (без авторизации/подменю).
// Проп acl у пункта: ресурс регистрируется сам, без права пункт скрыт.
import React, { useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { useAcl, registerResource } from '../acl';

/** Пункт меню. */
export interface MenuTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Идентификатор ресурса ('settings.menu.billing'). Нет права — пункт скрыт. */
  acl?: string;
}

export interface MenuProps {
  /** Пункты. */
  tabs: MenuTab[];
  /** Активный пункт. */
  activeTab: string;
  /** Навигация. */
  onTabChange: (id: string) => void;
  /** Тема оформления. */
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}

/** Вертикальное sticky-меню 240px. */
export function Menu({ tabs, activeTab, onTabChange, theme, className, style }: MenuProps) {
  const { can } = useAcl();

  useEffect(() => {
    for (const tab of tabs) {
      if (tab.acl) registerResource({ id: tab.acl, kind: 'menu', label: tab.label });
    }
  }, [tabs]);

  const visibleTabs = tabs.filter((tab) => can(tab.acl));

  return (
    <nav className={className} role="navigation" style={{
      width: 240, height: '100dvh', position: 'sticky', top: 0,
      overflowY: 'auto', overscrollBehavior: 'contain',
      background: theme.bgSurface, borderRight: `1px solid ${theme.border}`,
      padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
      ...style,
    }}>
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'system-ui',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? theme.accentText : theme.textMuted,
              background: isActive ? theme.accent : 'transparent',
              transition: 'background 0.2s, color 0.2s', width: '100%', textAlign: 'left',
              boxShadow: isActive ? `0 2px 12px ${theme.accentGlow}` : 'none',
            }}
            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = theme.navHoverBg; e.currentTarget.style.color = theme.text; } }}
            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textMuted; } }}
          >
            {tab.icon && <span style={{ display: 'inline-flex', fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}