import React from 'react';
import type { Theme } from '../../themes/theme';

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

  const baseColor = bgColor || t.accent;
  const finalBorder = borderColor || baseColor;

  let bgStyle: React.CSSProperties = {};
  let textStyle: React.CSSProperties = {};

  if (variant === 'filled') {
    bgStyle = { backgroundColor: baseColor };
    textStyle = { color: t.accentText };
  } else if (variant === 'outlined') {
    bgStyle = { backgroundColor: 'transparent' };
    textStyle = { color: finalBorder };
  } else {
    // soft — color-mix() вместо ручного hexToRgba
    bgStyle = {
      backgroundColor: `color-mix(in srgb, ${baseColor} ${Math.round(opacity * 100)}%, transparent)`,
    };
    textStyle = { color: finalBorder };
  }

  if (textColor) textStyle.color = textColor;

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
    boxShadow:
      variant === 'filled'
        ? `0 2px 6px color-mix(in srgb, ${baseColor} 27%, transparent)`
        : 'none',
  };

  return <span style={style}>{children}</span>;
}