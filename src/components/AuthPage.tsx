// AuthPage.tsx — страница входа с орбами, темизацией и подписью автора.
import {
  useState, useEffect, type CSSProperties, type FormEvent, type ReactNode,
} from 'react';
import { colorScheme, type Theme, type ThemeName } from '../themes/theme';
import { ThemeSwitcher } from './Header';
import { IcoLogIn } from './icons';
import CustomInput, { type CustomInputType } from './CustomInput';
import { useResponsive } from '../context/AppContext';

const CREATOR_EMAIL = 'Dmitriy.Savelyev@agr.auto';

const AUTH_CSS = `
.kbs-auth-logo { background: none; border: none; padding: 0; font: inherit; text-align: left; touch-action: manipulation; }
.kbs-auth-logo:not(:disabled) { cursor: pointer; }
.kbs-auth-submit { touch-action: manipulation; }
.kbs-auth-spinner { animation: kbs-auth-spin 0.7s linear infinite; }
@keyframes kbs-auth-spin { to { transform: rotate(360deg); } }
@media (hover: hover) {
  .kbs-auth-logo:not(:disabled):hover { opacity: 0.7; }
  .kbs-auth-submit:not(:disabled):hover { opacity: 0.88; }
  .kbs-auth-footer a:hover { color: var(--kbs-auth-accent); border-bottom-color: var(--kbs-auth-accent); }
}
.kbs-auth-logo:not(:disabled):focus-visible, .kbs-auth-submit:focus-visible, .kbs-auth-footer a:focus-visible {
  outline: 2px solid var(--kbs-auth-accent); outline-offset: 2px;
}
.kbs-auth-submit:active:not(:disabled) { transform: translateY(1px); }
@media (prefers-reduced-motion: reduce) {
  .kbs-auth-card, .kbs-auth-submit, .kbs-auth-logo { transition: none !important; }
  .kbs-auth-spinner { animation-duration: 1.6s; }
}
`;

export interface AuthPageProps {
  /** Тема оформления (токены). */
  t: Theme;
  /** Активная тема. */
  theme: ThemeName;
  /** Смена темы. */
  onThemeChange: (theme: ThemeName) => void;
  /** Submit: логин + пароль. Ошибку показывайте через authError. */
  onSuccess: (login: string, password: string) => void | Promise<void>;
  /** Внешняя блокировка (идёт запрос). */
  loading?: boolean;
  /** Название сайта. @default 'Nexus' */
  siteName?: string;
  /** Логотип. @default '◈' */
  logoSvg?: ReactNode;
  /** Клик по логотипу (на главную). */
  onLogoClick?: () => void;
  /** Метка поля логина. @default 'Email' */
  emailLabel?: string;
  /** Тип поля логина. @default 'email' */
  emailType?: CustomInputType;
  /** Ошибка авторизации с сервера. */
  authError?: string;
  /** Сброс серверной ошибки при вводе. */
  onClearAuthError?: () => void;
}

/** Страница авторизации. */
export function AuthPage({
  t, theme, onThemeChange, onSuccess, loading: externalLoading,
  siteName = 'Nexus', logoSvg = '◈', onLogoClick,
  emailLabel = 'Email', emailType = 'email', authError, onClearAuthError,
}: AuthPageProps) {
  const { isMobile, prefersReducedMotion } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mounted, setMounted] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  const busy = loading || !!externalLoading;
  const clearServer = () => { if (authError && onClearAuthError) onClearAuthError(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError(''); setPasswordError(''); clearServer();
    let hasError = false;
    if (!email.trim()) { setEmailError('Поле обязательно'); hasError = true; }
    if (!password.trim()) { setPasswordError('Поле Пароль обязательно'); hasError = true; }
    if (hasError) return;
    setLoading(true);
    try { await onSuccess(email.trim(), password); } catch { /* ошибку показывает authError */ }
    finally { setLoading(false); }
  };

  const cardPadX = isMobile ? 20 : 32;
  const cardPadTop = isMobile ? 22 : 28;
  const cardPadBottom = isMobile ? 24 : 32;

  return (
    <div className="kbs-auth" style={{
      minHeight: '100dvh', background: t.bg, colorScheme: colorScheme(t.bg),
      display: 'flex', position: 'relative', overflow: 'hidden',
      padding: isMobile ? 16 : 24,
      paddingTop: isMobile ? 'calc(56px + env(safe-area-inset-top, 0px))' : 24,
      paddingBottom: `calc(${isMobile ? 44 : 40}px + env(safe-area-inset-bottom, 0px))`,
      '--kbs-auth-accent': t.accent,
    } as CSSProperties}>
      <style>{AUTH_CSS}</style>

      <div style={{
        position: 'absolute', top: '-15%', right: '-10%',
        width: isMobile ? 320 : 480, height: isMobile ? 320 : 480, borderRadius: '50%',
        background: `radial-gradient(circle, ${t.accent}22 0%, transparent 70%)`, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: isMobile ? 360 : 560, height: isMobile ? 360 : 560, borderRadius: '50%',
        background: `radial-gradient(circle, ${t.border}18 0%, transparent 70%)`, pointerEvents: 'none',
      }} />

      <div style={{ position: 'absolute', top: isMobile ? 12 : 24, right: isMobile ? 12 : 24, zIndex: 2 }}>
        <ThemeSwitcher theme={theme} onChange={onThemeChange} t={t} compact={isMobile} />
      </div>

      <div className="kbs-auth-card" style={{
        margin: 'auto', position: 'relative', zIndex: 1, width: '100%', maxWidth: isMobile ? '100%' : 420,
        background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: isMobile ? 16 : 20,
        boxShadow: t.shadowLg, overflow: 'hidden',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        transition: prefersReducedMotion ? 'none' : 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: `${cardPadTop}px ${cardPadX}px 0` }}>
          <button type="button" className="kbs-auth-logo" onClick={onLogoClick} disabled={!onLogoClick}
            aria-label={onLogoClick ? 'На главную' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, minHeight: isMobile ? 44 : 34, transition: 'opacity 0.2s' }}>
            <div style={{
              width: 34, height: 34, background: t.accent, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: t.accentText, fontWeight: 700,
              boxShadow: `0 0 20px ${t.accentGlow}`, flexShrink: 0,
            }}>{logoSvg}</div>
            <span style={{ fontFamily: 'system-ui', fontWeight: 800, fontSize: 18, color: t.text, letterSpacing: '-0.02em' }}>
              {siteName}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate
          style={{ padding: `0 ${cardPadX}px ${cardPadBottom}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CustomInput label={emailLabel} theme={t} value={email}
            type={emailType} error={emailError}
            onChange={(v) => { setEmail(v); clearServer(); }} />
          <CustomInput type="password" label="Пароль" theme={t} value={password} error={passwordError}
            onChange={(v) => { setPassword(v); clearServer(); }} />
          {authError && (
            <div role="alert" style={{ color: t.danger, fontSize: 13, textAlign: 'center', marginTop: -4, marginBottom: 4 }}>
              {authError}
            </div>
          )}
          <button type="submit" className="kbs-auth-submit" disabled={busy} aria-busy={busy}
            style={{
              padding: isMobile ? '14px 0' : '11px 0', minHeight: 48, borderRadius: 10, border: 'none',
              background: busy ? t.bgSubmit : t.accent, color: t.accentText,
              fontSize: 14, fontWeight: 700, fontFamily: 'system-ui',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s, background 0.2s, box-shadow 0.2s',
              boxShadow: busy ? 'none' : `0 4px 20px ${t.accentGlow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
            }}>
            {busy ? (
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span className="kbs-auth-spinner" style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: `2px solid ${t.accentText}40`, borderTopColor: t.accentText, borderRadius: '50%',
                }} />
                Signing in…
              </span>
            ) : (
              <>Войти <IcoLogIn s={15} /></>
            )}
          </button>
        </form>
      </div>

      <div className="kbs-auth-footer" style={{
        position: 'fixed', bottom: 'max(10px, env(safe-area-inset-bottom, 0px))', left: 0, right: 0,
        textAlign: 'center', fontSize: 11, letterSpacing: '0.02em', color: t.textMuted, opacity: 0.6,
        fontFamily: 'system-ui, -apple-system, sans-serif', userSelect: 'text', pointerEvents: 'none',
        zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 8px',
      }}>
        <span style={{ fontWeight: 600, color: t.text, opacity: 0.9 }}>KBS</span>
        <span style={{ margin: '0 6px' }}>·</span><span>АГР Тех</span><span style={{ margin: '0 6px' }}>·</span>
        <a href={`mailto:${CREATOR_EMAIL}?subject=${encodeURIComponent(`Баг/Предложение по модификации. ${siteName}`)}`}
          title={`Написать письмо: ${CREATOR_EMAIL}`}
          style={{
            color: 'inherit', textDecoration: 'none', cursor: 'pointer', pointerEvents: 'auto',
            transition: 'color 0.15s ease', borderBottom: '1px dotted transparent', touchAction: 'manipulation',
          }}>
          Савельев Дмитрий
        </a>
        <span style={{ margin: '0 6px' }}>·</span><span>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}