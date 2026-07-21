import { useState, useEffect, useRef } from 'react';
import { Theme } from '../themes/theme';
import { IcoLogIn, IcoLogOut, IcoChevronLeft, IcoChevronRight } from './icons';

export interface NavTab {
  id: string;
  label: string;
  icon: string;
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
}

// ── Горизонтальный Header ──────────────────────────────────────
export function HorizontalHeader({
  t,
  activeTab,
  onTabChange,
  isLoggedIn,
  onSignIn,
  onSignOut,
  userName,
  navTabs,
}: HeaderBaseProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: t.bgSurface, borderBottom: `1px solid ${t.border}`, boxShadow: t.shadow, position: 'sticky', top: 0, zIndex: 100, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: t.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui', boxShadow: `0 0 16px ${t.accentGlow}` }}>◈</div>
        <span style={{ fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.01em' }}>Nexus</span>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
        {navTabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'system-ui', fontWeight: active ? 600 : 400, color: active ? t.accentText : t.textMuted, background: active ? t.accent : 'transparent', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', whiteSpace: 'nowrap', boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none' }} onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{tab.icon}</span>{tab.label}
            </button>
          );
        })}
      </nav>
      <div style={{ flexShrink: 0 }} ref={dropRef}>
        {isLoggedIn ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setDropOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 6px', borderRadius: 24, border: `1px solid ${t.border}`, background: t.bgSurface, cursor: 'pointer', transition: 'all 0.2s', boxShadow: dropOpen ? `0 0 0 2px ${t.accentGlow}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui' }}>{userName?.[0]?.toUpperCase()}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: 'system-ui', lineHeight: 1.2 }}>{userName}</div>
                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'system-ui', lineHeight: 1.2 }}>Pro plan</div>
              </div>
              <span style={{ color: t.textMuted, fontSize: 10, transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'none', display: 'flex' }}>▾</span>
            </button>
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '6px', minWidth: 160, boxShadow: t.shadowLg, opacity: dropOpen ? 1 : 0, transform: dropOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)', pointerEvents: dropOpen ? 'all' : 'none', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', zIndex: 200 }}>
              {[['◈ Profile', false], ['⚙ Settings', false], ['— Sign out', true]].map(([label, danger]) => (
                <button key={String(label)} onClick={String(label).includes('Sign out') ? onSignOut : undefined} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'system-ui', color: danger ? t.danger : t.text, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = danger ? `${t.danger}18` : t.navHoverBg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  {String(label)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={onSignIn} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, border: 'none', background: t.accent, color: t.accentText, fontSize: 13.5, fontWeight: 600, fontFamily: 'system-ui', cursor: 'pointer', transition: 'opacity 0.2s', boxShadow: `0 2px 16px ${t.accentGlow}` }} onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <IcoLogIn s={15} /> Sign in
          </button>
        )}
      </div>
    </header>
  );
}

// ── Вертикальный Header ──────────────────────────────────────
export function VerticalHeader({
  t,
  activeTab,
  onTabChange,
  isLoggedIn,
  onSignIn,
  onSignOut,
  userName,
  navTabs,
}: HeaderBaseProps) {
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? 64 : 220;

  return (
    <aside style={{ width: w, minHeight: '100%', background: t.bgSurface, borderRight: `1px solid ${t.border}`, boxShadow: t.shadow, display: 'flex', flexDirection: 'column', transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '18px 0' : '16px 16px 16px 18px', borderBottom: `1px solid ${t.borderSubtle}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, overflow: 'hidden' }}>
          <div style={{ width: 30, height: 30, background: t.accent, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: t.accentText, fontWeight: 700, flexShrink: 0, boxShadow: `0 0 16px ${t.accentGlow}` }}>◈</div>
          <span style={{ fontFamily: 'system-ui', fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 120, transition: 'opacity 0.2s, max-width 0.32s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>Nexus</span>
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4, borderRadius: 6, transition: 'all 0.15s', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}>
            <IcoChevronLeft s={16} />
          </button>
        )}
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, marginBottom: 6, borderRadius: 8, border: 'none', background: 'transparent', color: t.textMuted, cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}>
            <IcoChevronRight s={16} />
          </button>
        )}
        {navTabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} title={collapsed ? tab.label : undefined} style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '8px' : '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'system-ui', fontWeight: active ? 600 : 400, color: active ? t.accentText : t.textMuted, background: active ? t.accent : 'transparent', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', whiteSpace: 'nowrap', overflow: 'hidden', boxShadow: active ? `0 2px 12px ${t.accentGlow}` : 'none' }} onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}>
              <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{tab.icon}</span>
              <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto', overflow: 'hidden', transition: 'opacity 0.18s', whiteSpace: 'nowrap' }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${t.borderSubtle}`, flexShrink: 0 }}>
        {isLoggedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '8px' : '8px 10px', borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgSurface, overflow: 'hidden' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: t.accentText, fontWeight: 700, fontFamily: 'system-ui', flexShrink: 0 }}>{userName?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, overflow: 'hidden', opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto', transition: 'opacity 0.18s' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: 'system-ui', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'system-ui', lineHeight: 1.3 }}>Pro plan</div>
            </div>
            {!collapsed && (
              <button onClick={onSignOut} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }} title="Sign out" onMouseEnter={e => e.currentTarget.style.color = t.danger} onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>
                <IcoLogOut s={15} />
              </button>
            )}
          </div>
        ) : (
          <button onClick={onSignIn} style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, justifyContent: 'center', width: '100%', padding: '9px 12px', borderRadius: 9, border: 'none', background: t.accent, color: t.accentText, fontSize: 13.5, fontWeight: 600, fontFamily: 'system-ui', cursor: 'pointer', transition: 'opacity 0.2s', boxShadow: `0 2px 16px ${t.accentGlow}`, whiteSpace: 'nowrap', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <IcoLogIn s={15} />
            <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto', transition: 'opacity 0.18s', overflow: 'hidden' }}>Sign in</span>
          </button>
        )}
      </div>
    </aside>
  );
}