// LoadingOverlay.tsx — оверлей загрузки поверх relative-контейнера.
import { useEffect, useState } from 'react';
import type { Theme } from '../themes/theme';
import { useStyleTag } from '../hooks';

export interface LoadingOverlayProps {
  /** Показывать оверлей. */
  visible: boolean;
  /** Тема оформления. */
  theme: Theme;
  /** Подпись под спиннером. @default 'Загрузка…' */
  label?: string;
  /** Скругление углов. @default 10 */
  borderRadius?: number;
  /** Задержка появления (против мигания), мс. @default 200 */
  delayMs?: number;
}

const CSS = `
@keyframes loadingSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-overlay-spinner { animation-duration: 2s; } }
`;

/** Полупрозрачный оверлей со спиннером; появляется с задержкой. */
export default function LoadingOverlay({
  visible, theme, label = 'Загрузка…', borderRadius = 10, delayMs = 200,
}: LoadingOverlayProps) {
  useStyleTag('kbs-loading-overlay-css', CSS);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) { setShow(false); return; }
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [visible, delayMs]);
  if (!show) return null;
  return (
    <div aria-busy="true" style={{
      position: 'absolute', inset: 0, borderRadius, overflow: 'hidden', zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      backgroundColor: 'rgba(0,0,0,0.25)',
      background: `color-mix(in srgb, ${theme.bgSurface} 60%, transparent)`,
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', pointerEvents: 'all',
    }}>
      <div className="loading-overlay-spinner" style={{
        width: 34, height: 34, border: `3px solid ${theme.border}`, borderTopColor: theme.accent,
        borderRadius: '50%', animation: 'loadingSpin 0.8s linear infinite',
      }} />
      {label && (
        <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'system-ui', userSelect: 'none' }}>{label}</div>
      )}
    </div>
  );
}