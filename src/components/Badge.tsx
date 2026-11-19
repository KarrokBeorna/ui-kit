// Badge.tsx — бейдж-пилюля (filled / outlined / soft).
import React from 'react';
import type { Theme } from '../themes/theme';

export interface BadgeProps {
  /** Тема оформления. */
  theme: Theme;
  /** Содержимое. */
  children: React.ReactNode;
  /** Базовый цвет (по умолчанию theme.accent). */
  bgColor?: string;
  /** Цвет рамки (по умолчанию bgColor). */
  borderColor?: string;
  /** Цвет текста (переопределяет автоматический). */
  textColor?: string;
  /** Размер. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Стиль заливки. @default 'soft' */
  variant?: 'filled' | 'outlined' | 'soft';
  /** Насыщенность soft-фона, 0..1. @default 0.15 */
  opacity?: number;
}

/** Бейдж статуса/метки. */
export default function Badge({
  theme: t, children, bgColor, borderColor, textColor,
  size = 'md', variant = 'soft', opacity = 0.15,
}: BadgeProps) {
  const sizeMap = {
    sm: { padding: '2px 10px', fontSize: 11 },
    md: { padding: '4px 14px', fontSize: 13 },
    lg: { padding: '6px 20px', fontSize: 15 },
  };
  const baseColor = bgColor || t.accent;
  const finalBorder = borderColor || baseColor;
  const bg = variant === 'filled' ? baseColor
    : variant === 'outlined' ? 'transparent'
    : `color-mix(in srgb, ${baseColor} ${Math.round(opacity * 100)}%, transparent)`;
  const color = textColor ?? (variant === 'filled' ? t.accentText : finalBorder);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: sizeMap[size].padding, fontSize: sizeMap[size].fontSize, borderRadius: 9999,
      border: `1.5px solid ${finalBorder}`, backgroundColor: bg, color,
      fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap', transition: 'all 0.2s ease',
      boxShadow: variant === 'filled' ? `0 2px 6px color-mix(in srgb, ${baseColor} 27%, transparent)` : 'none',
    }}>
      {children}
    </span>
  );
}