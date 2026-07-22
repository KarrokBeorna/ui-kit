import React from 'react';
import type { Theme } from '../themes/theme';

interface BadgeProps {
  theme: Theme;
  children: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'soft';
  opacity?: number;
}

export default function Badge({
  theme: t,
  children,
  bgColor,
  borderColor,
  textColor,
  size = 'md',
  variant = 'soft',
  opacity = 0.15,
}: BadgeProps) {
  const sizeMap = {
    sm: { padding: '2px 10px', fontSize: 11, borderRadius: 9999 },
    md: { padding: '4px 14px', fontSize: 13, borderRadius: 9999 },
    lg: { padding: '6px 20px', fontSize: 15, borderRadius: 9999 },
  };

  // Основной цвет: если не передан, берём accent из темы
  const baseColor = bgColor || t.accent;
  // Цвет границы: если не передан, используем baseColor
  const finalBorder = borderColor || baseColor;
  // Цвет текста: если не передан, используем baseColor (для soft/filled) или t.accentText (для filled с непрозрачным фоном)
  let finalText = textColor || baseColor;

  // - Для 'soft' – фон с opacity, граница яркая, текст – цвет границы.
  // - Для 'outlined' – прозрачный фон, граница яркая, текст – цвет границы.
  // - Для 'filled' – сплошной фон, белый текст (можно оставить для резерва).

  let bgStyle: React.CSSProperties = {};
  let textStyle: React.CSSProperties = {};

  if (variant === 'filled') {
    // Полностью непрозрачный фон, белый текст
    bgStyle = { backgroundColor: baseColor };
    textStyle = { color: t.accentText };
  } else if (variant === 'outlined') {
    // Прозрачный фон, только граница
    bgStyle = { backgroundColor: 'transparent' };
    textStyle = { color: finalBorder };
  } else { // soft (по умолчанию)
    // Полупрозрачный фон, цвет текста = цвет границы
    const rgba = hexToRgba(baseColor, opacity);
    bgStyle = { backgroundColor: rgba };
    textStyle = { color: finalBorder };
  }

  // Если явно задан textColor, переопределяем
  if (textColor) {
    textStyle.color = textColor;
  }

  // Если явно задан bgColor, используем его с прозрачностью для soft
  // Уже сделано через hexToRgba

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sizeMap[size].padding,
    fontSize: sizeMap[size].fontSize,
    borderRadius: sizeMap[size].borderRadius,
    border: `1.5px solid ${finalBorder}`,
    ...bgStyle,
    ...textStyle,
    fontWeight: 500,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    boxShadow: variant === 'filled' ? `0 2px 6px ${baseColor}44` : 'none',
  };

  return <span style={style}>{children}</span>;
}

// Вспомогательная функция для преобразования hex в rgba
function hexToRgba(hex: string, alpha: number): string {
  let r = 0, g = 0, b = 0;
  if (hex.startsWith('#')) {
    const clean = hex.slice(1);
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}