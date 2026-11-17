import { useEffect, useState } from 'react';
import { Theme } from '../themes/theme';

interface LoadingOverlayProps {
  visible: boolean;
  theme: Theme;
  label?: string;
  borderRadius?: number;
  delayMs?: number;
}

export default function LoadingOverlay({
  visible,
  theme,
  label = 'Загрузка…',
  borderRadius = 10,
  delayMs = 200,
}: LoadingOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [visible, delayMs]);

  if (!show) return null;

  return (
    <div
      aria-busy="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        overflow: 'hidden',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        // Универсальный fallback, если color-mix не поддерживается.
        backgroundColor: 'rgba(0,0,0,0.25)',
        // Перекрывает backgroundColor, если браузер понимает color-mix.
        background: `color-mix(in srgb, ${theme.bgSurface} 60%, transparent)`,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        pointerEvents: 'all',
      }}
    >
      <div className="loading-overlay-spinner" style={{
        width: 34,
        height: 34,
        border: `3px solid ${theme.border}`,
        borderTopColor: theme.accent,
        borderRadius: '50%',
        animation: 'loadingSpin 0.8s linear infinite',
      }} />
      {label && (
        <div style={{
          fontSize: 13,
          color: theme.textMuted,
          fontFamily: 'system-ui',
          userSelect: 'none',
        }}>
          {label}
        </div>
      )}
      <style>{`
        @keyframes loadingSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .loading-overlay-spinner { animation-duration: 2s; }
        }
      `}</style>
    </div>
  );
}