import { useState, useEffect } from 'react';
import { Theme, ThemeName } from '../themes/theme';
import { ThemeSwitcher } from './ThemeSwitcher';
import { IcoLogIn } from './icons';
import PasswordInput from './PasswordInput';
import TextInput, {TextInputType} from './TextInput';

interface AuthPageProps {
  t: Theme;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSuccess: (login: string, hashPass: string) => void;
  loading?: boolean;
  siteName?: string;
  logoSvg?: React.ReactNode;
  onLogoClick?: () => void;
  emailLabel?: string;
  emailType?: TextInputType;
  authError?: string;
  onClearAuthError?: () => void;
}

export function AuthPage({
  t,
  theme,
  onThemeChange,
  onSuccess,
  loading: externalLoading,
  siteName = 'Nexus',
  logoSvg = '◈',
  onLogoClick,
  emailLabel = 'Email',
  emailType = 'email',
  authError,
  onClearAuthError,
}: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authError && onClearAuthError) onClearAuthError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (authError && onClearAuthError) onClearAuthError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    if (authError && onClearAuthError) onClearAuthError();

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Поле обязательно');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('Поле Пароль обязательно');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(email, password);
    }, 1100);
  };

  const handleLogoClick = () => {
    if (onLogoClick) onLogoClick();
  };

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
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orbA}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orbB}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

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
          transition:
            'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ padding: '28px 32px 0' }}>
          <div
            onClick={handleLogoClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 24,
              cursor: onLogoClick ? 'pointer' : 'default',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              if (onLogoClick) e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                background: t.accent,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: t.accentText,
                fontWeight: 700,
                boxShadow: `0 0 20px ${t.accentGlow}`,
              }}
            >
              {logoSvg}
            </div>
            <span
              style={{
                fontFamily: 'system-ui',
                fontWeight: 800,
                fontSize: 18,
                color: t.text,
                letterSpacing: '-0.02em',
              }}
            >
              {siteName}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label={emailLabel}
            theme={t}
            value={email}
            onChange={handleEmailChange}
            inputType={emailType}
            error={emailError}
          />

          <PasswordInput
            label="Пароль"
            theme={t}
            value={password}
            onChange={handlePasswordChange}
            error={passwordError}
            showStrength={false}
          />

          {authError && (
            <div
              style={{
                color: t.danger,
                fontSize: 13,
                textAlign: 'center',
                marginTop: -4,
                marginBottom: 4,
              }}
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || externalLoading}
            style={{
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: loading || externalLoading ? t.bgSubmit : t.accent,
              color: t.accentText,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'system-ui',
              cursor: loading || externalLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || externalLoading ? 'none' : `0 4px 20px ${t.accentGlow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              if (!loading && !externalLoading) e.currentTarget.style.opacity = '0.88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {loading || externalLoading ? (
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: `2px solid ${t.accentText}40`,
                    borderTopColor: t.accentText,
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Signing in…
              </span>
            ) : (
              <>
                Войти <IcoLogIn s={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}