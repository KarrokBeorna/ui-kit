import { useEffect, useState } from 'react';
import { Theme } from '../themes/theme';

interface LoadingOverlayProps {
  /** Показывать ли оверлей. Обычно — флаг `loading` из useFetch. */
  visible: boolean;
  theme: Theme;
  label?: string;
  /** Скругление, чтобы совпало с контейнером таблицы. */
  borderRadius?: number;
  /**
   * Задержка перед появлением, мс. Гасит мигание на быстрых запросах
   * (< 200 мс) и на автоперезапросах: короткие ответы оверлей не покажут.
   */
  delayMs?: number;
}

/**
 * Полупрозрачный overlay с blur-эффектом «за стеклом».
 * Позиционируется absolute — родитель должен иметь `position: relative`.
 */
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
        // color-mix даёт полупрозрачный фон от любого CSS-цвета темы
        // (hex, rgb, hsl). Прозрачность 60% — таблица видна, но приглушена.
        background: `color-mix(in srgb, ${theme.bgSurface} 60%, transparent)`,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          border: `3px solid ${theme.border}`,
          borderTopColor: theme.accent,
          borderRadius: '50%',
          animation: 'loadingSpin 0.8s linear infinite',
        }}
      />
      {label && (
        <div
          style={{
            fontSize: 13,
            color: theme.textMuted,
            fontFamily: 'system-ui',
            userSelect: 'none',
          }}
        >
          {label}
        </div>
      )}
      <style>{`@keyframes loadingSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}