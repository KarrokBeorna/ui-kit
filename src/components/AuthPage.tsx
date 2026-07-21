import { useState, useEffect } from 'react';
import { Theme, ThemeName } from '../themes/theme';
import { ThemeSwitcher } from './ThemeSwitcher';
import { inputStyle } from './helpers';
import { IcoEye, IcoLogIn } from './icons';

interface AuthPageProps {
  t: Theme;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSuccess: (userName: string) => void;
  /** Флаг для показа спиннера (опционально) */
  loading?: boolean;
}

export function AuthPage({ t, theme, onThemeChange, onSuccess, loading: externalLoading }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const focusStyle = (el: HTMLInputElement) => { el.style.borderColor = t.accent; el.style.boxShadow = `0 0 0 3px ${t.accentGlow}`; };
  const blurStyle = (el: HTMLInputElement) => { el.style.borderColor = t.border; el.style.boxShadow = 'none'; };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(email.split('@')[0]);
    }, 1100);
  };

  // Декоративные орбы (цвета берутся из темы)
  const orbA = t.accent;
  const orbB = t.border;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: 24,
      }}
    >
      <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${orbA}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${orbB}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <ThemeSwitcher theme={theme} onChange={onThemeChange} t={t} />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          boxShadow: t.shadowLg,
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ padding: '28px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 34, height: 34, background: t.accent, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: t.accentText, fontWeight: 700, boxShadow: `0 0 20px ${t.accentGlow}` }}>◈</div>
            <span style={{ fontFamily: 'system-ui', fontWeight: 800, fontSize: 18, color: t.text, letterSpacing: '-0.02em' }}>Nexus</span>
          </div>
          <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700, color: t.text, fontFamily: 'system-ui', letterSpacing: '-0.02em' }}>Welcome back</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: 'system-ui', letterSpacing: '0.04em' }}>Email</label>
            <input
              type="email"
              placeholder="email@mail.ru"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle(t, { padding: '10px 14px' })}
              onFocus={e => focusStyle(e.currentTarget)}
              onBlur={e => blurStyle(e.currentTarget)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: 'system-ui', letterSpacing: '0.04em' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle(t, { padding: '10px 42px 10px 14px', width: '100%' })}
                onFocus={e => focusStyle(e.currentTarget)}
                onBlur={e => blurStyle(e.currentTarget)}
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = t.text}
                onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
              >
                <IcoEye s={16} off={!showPwd} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '9px 14px', borderRadius: 8, background: `${t.danger}15`, border: `1px solid ${t.danger}44`, color: t.danger, fontSize: 13, fontFamily: 'system-ui' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || externalLoading}
            style={{
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: (loading || externalLoading) ? t.bgSubmit : t.accent,
              color: t.accentText,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'system-ui',
              cursor: (loading || externalLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: (loading || externalLoading) ? 'none' : `0 4px 20px ${t.accentGlow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading && !externalLoading) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {(loading || externalLoading) ? (
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${t.accentText}40`, borderTopColor: t.accentText, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Signing in…
              </span>
            ) : (
              <>Войти <IcoLogIn s={15} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}