// UI Kit
import {
  useState, useEffect,
  type CSSProperties, type FormEvent, type ReactNode,
} from 'react';
import { Theme, ThemeName } from '../themes/theme';
import { ThemeSwitcher } from './header/ThemeSwitcher';
import { IcoLogIn } from './icons';
import PasswordInput from './inputs/PasswordInput';
import TextInput, { TextInputType } from './inputs/TextInput';
import { useResponsive } from '../context/ResponsiveContext';

const CREATOR_EMAIL = 'Dmitriy.Savelyev@agr.auto';

/**
 * Скоуп-стили компонента. Вынесены в один <style>-блок, чтобы не плодить
 * CSS-файлы; при появлении общего stylesheet библиотеки — удалить.
 * Акцент приходит через CSS-переменную --kbs-auth-accent (выставляется inline).
 */
const AUTH_CSS = `
.kbs-auth-logo {
  background: none; border: none; padding: 0; font: inherit; text-align: left;
  touch-action: manipulation;
}
.kbs-auth-logo:not(:disabled) { cursor: pointer; }
.kbs-auth-submit { touch-action: manipulation; }
.kbs-auth-spinner { animation: kbs-auth-spin 0.7s linear infinite; }
@keyframes kbs-auth-spin { to { transform: rotate(360deg); } }

@media (hover: hover) {
  .kbs-auth-logo:not(:disabled):hover { opacity: 0.7; }
  .kbs-auth-submit:not(:disabled):hover { opacity: 0.88; }
  .kbs-auth-footer a:hover {
    color: var(--kbs-auth-accent);
    border-bottom-color: var(--kbs-auth-accent);
  }
}
.kbs-auth-logo:not(:disabled):focus-visible,
.kbs-auth-submit:focus-visible,
.kbs-auth-footer a:focus-visible {
  outline: 2px solid var(--kbs-auth-accent);
  outline-offset: 2px;
}
.kbs-auth-submit:active:not(:disabled) { transform: translateY(1px); }

@media (prefers-reduced-motion: reduce) {
  .kbs-auth-card, .kbs-auth-submit, .kbs-auth-logo { transition: none !important; }
  .kbs-auth-spinner { animation-duration: 1.6s; }
}
`;

/* На мобильном инпуты ≥16px, иначе iOS Safari зумит страницу при фокусе.
   !important — чтобы перебить inline font-size внутри TextInput/PasswordInput. */
const MOBILE_INPUT_CSS = `
.kbs-auth-card input { font-size: 16px !important; }
`;

const colorScheme = (bg: string): 'light' | 'dark' => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return 'light';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const lum =
    (0.2126 * parseInt(h.slice(0, 2), 16) +
      0.7152 * parseInt(h.slice(2, 4), 16) +
      0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
  return lum < 0.5 ? 'dark' : 'light';
};

interface AuthPageProps {
  t: Theme;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSuccess: (login: string, password: string) => void | Promise<void>;
  loading?: boolean;
  siteName?: string;
  logoSvg?: ReactNode;
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

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authError && onClearAuthError) onClearAuthError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (authError && onClearAuthError) onClearAuthError();
  };

  const handleSubmit = async (e: FormEvent) => {
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
    try {
      await onSuccess(email.trim(), password);
    } catch {
      // ошибку показывает authError снаружи
    } finally {
      setLoading(false);
    }
  };

  const orbA = t.accent;
  const orbB = t.border;
  const cardPadX = isMobile ? 20 : 32;
  const cardPadTop = isMobile ? 22 : 28;
  const cardPadBottom = isMobile ? 24 : 32;

  return (
    <div
      className="kbs-auth"
      style={{
        minHeight: '100dvh',
        background: t.bg,
        colorScheme: colorScheme(t.bg),
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? 16 : 24,
        /* сверху резервируем место под переключатель темы, снизу — под подпись */
        paddingTop: isMobile ? 'calc(56px + env(safe-area-inset-top, 0px))' : 24,
        paddingBottom: `calc(${isMobile ? 44 : 40}px + env(safe-area-inset-bottom, 0px))`,
        ['--kbs-auth-accent' as string]: t.accent,
      } as CSSProperties}
    >
      <style>{AUTH_CSS + (isMobile ? MOBILE_INPUT_CSS : '')}</style>

      {/* Орбы */}
      <div
        style={{
          position: 'absolute', top: '-15%', right: '-10%',
          width: isMobile ? 320 : 480, height: isMobile ? 320 : 480,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orbA}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: isMobile ? 360 : 560, height: isMobile ? 360 : 560,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orbB}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Переключатель темы */}
      <div style={{ position: 'absolute', top: isMobile ? 12 : 24, right: isMobile ? 12 : 24, zIndex: 2 }}>
        <ThemeSwitcher theme={theme} onChange={onThemeChange} t={t} compact={isMobile} />
      </div>

      {/* Карточка формы. margin:auto вместо center-выравнивания родителя:
          при нехватке высоты карточка прижимается к верху и страница скроллится,
          а не обрезается. */}
      <div
        className="kbs-auth-card"
        style={{
          margin: 'auto',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: isMobile ? '100%' : 420,
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: isMobile ? 16 : 20,
          boxShadow: t.shadowLg,
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: prefersReducedMotion
            ? 'none'
            : 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Логотип */}
        <div style={{ padding: `${cardPadTop}px ${cardPadX}px 0` }}>
          <button
            type="button"
            className="kbs-auth-logo"
            onClick={onLogoClick}
            disabled={!onLogoClick}
            aria-label={onLogoClick ? 'На главную' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
              minHeight: isMobile ? 44 : 34,
              transition: 'opacity 0.2s',
            }}
          >
            <div
              style={{
                width: 34, height: 34, background: t.accent, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: t.accentText, fontWeight: 700,
                boxShadow: `0 0 20px ${t.accentGlow}`,
                flexShrink: 0,
              }}
            >
              {logoSvg}
            </div>
            <span
              style={{
                fontFamily: 'system-ui', fontWeight: 800, fontSize: 18,
                color: t.text, letterSpacing: '-0.02em',
              }}
            >
              {siteName}
            </span>
          </button>
        </div>

        {/* Форма. noValidate — валидация кастомная, иначе браузер перехватит
            submit на type=email и не покажет наши сообщения. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ padding: `0 ${cardPadX}px ${cardPadBottom}px`, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
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
              role="alert"
              style={{ color: t.danger, fontSize: 13, textAlign: 'center', marginTop: -4, marginBottom: 4 }}
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="kbs-auth-submit"
            disabled={busy}
            aria-busy={busy}
            style={{
              padding: isMobile ? '14px 0' : '11px 0',
              minHeight: 48,
              borderRadius: 10,
              border: 'none',
              background: busy ? t.bgSubmit : t.accent,
              color: t.accentText,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'system-ui',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s, background 0.2s, box-shadow 0.2s',
              boxShadow: busy ? 'none' : `0 4px 20px ${t.accentGlow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 4,
            }}
          >
            {busy ? (
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span
                  className="kbs-auth-spinner"
                  style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: `2px solid ${t.accentText}40`,
                    borderTopColor: t.accentText,
                    borderRadius: '50%',
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

      {/* Подпись автора */}
      <div
        className="kbs-auth-footer"
        style={{
          position: 'fixed',
          bottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          textAlign: 'center', fontSize: 11, letterSpacing: '0.02em',
          color: t.textMuted, opacity: 0.6,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          userSelect: 'text', pointerEvents: 'none', zIndex: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          padding: '0 8px',
        }}
      >
        <span style={{ fontWeight: 600, color: t.text, opacity: 0.9 }}>KBS</span>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>АГР Тех</span>
        <span style={{ margin: '0 6px' }}>·</span>
        <a
          href={`mailto:${CREATOR_EMAIL}?subject=${encodeURIComponent(`Баг/Предложение по модификации. ${siteName}`)}`}
          title={`Написать письмо: ${CREATOR_EMAIL}`}
          style={{
            color: 'inherit', textDecoration: 'none', cursor: 'pointer',
            pointerEvents: 'auto', transition: 'color 0.15s ease',
            borderBottom: '1px dotted transparent', touchAction: 'manipulation',
          }}
        >
          Савельев Дмитрий
        </a>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}