import React from 'react';
import { Theme } from '../themes/theme';

export interface MenuTab {
  id: string;
  label: string;
  icon?: string;
}

interface MenuProps {
  tabs: MenuTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}

export function Menu({ tabs, activeTab, onTabChange, theme, className, style }: MenuProps) {
  return (
    <nav
      className={className}
      style={{
        width: 240,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        background: theme.bgSurface,
        borderRight: `1px solid ${theme.border}`,
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontFamily: 'system-ui',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? theme.accentText : theme.textMuted,
              background: isActive ? theme.accent : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              textAlign: 'left',
              boxShadow: isActive ? `0 2px 12px ${theme.accentGlow}` : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = theme.navHoverBg;
                e.currentTarget.style.color = theme.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textMuted;
              }
            }}
          >
            {tab.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}