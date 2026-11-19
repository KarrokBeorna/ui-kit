// Button.tsx — кнопка (primary / danger / success, outline, sm/md).
import React from 'react';
import type { Theme } from '../themes/theme';

export interface ButtonProps {
  /** Иконка слева от текста. */
  icon?: React.ReactNode;
  /** Содержимое кнопки. */
  children?: React.ReactNode;
  /** Цветовая роль. @default 'primary' */
  variant?: 'primary' | 'danger' | 'success';
  /** Контурный стиль вместо заливки. */
  outline?: boolean;
  /** Размер. @default 'md' */
  size?: 'sm' | 'md';
  /** Клик. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Блокировка. */
  disabled?: boolean;
  /** Тема оформления. */
  theme: Theme;
  /** Тип кнопки. @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  /** Доступная подпись (обязательна для кнопок без текста). */
  'aria-label'?: string;
  /** Нативный тултип. */
  title?: string;
}

/** Кнопка UI Kit. Hover не залипает на таче (pointerType === 'mouse'). */
export default function Button({
  icon, children, variant = 'primary', outline = false, size = 'md',
  onClick, disabled = false, theme, type = 'button', className = '', style = {},
  'aria-label': ariaLabel, title,
}: ButtonProps) {
  const solidColor = variant === 'danger' ? theme.danger : variant === 'success' ? theme.success : theme.accent;
  const textColor = variant === 'primary' ? theme.accentText : '#ffffff';
  const colors = outline
    ? { background: 'transparent', color: solidColor, border: `1px solid ${solidColor}`, hover: `color-mix(in srgb, ${solidColor} 10%, transparent)` }
    : { background: solidColor, color: textColor, border: 'none', hover: undefined as string | undefined };

  const sizeStyles = size === 'sm'
    ? { padding: '4px 10px', fontSize: '12px', gap: '5px' }
    : { padding: '8px 20px', fontSize: '13px', gap: '8px' };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, fontFamily: 'system-ui', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s, opacity 0.15s, box-shadow 0.15s',
    touchAction: 'manipulation', ...sizeStyles,
    background: colors.background, color: colors.color, border: colors.border,
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'primary' && !outline ? { boxShadow: `0 2px 14px ${theme.accentGlow}` } : null),
    ...style,
  };

  const onHover = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.pointerType !== 'mouse') return;
    if (outline) e.currentTarget.style.background = colors.hover || 'transparent';
    else e.currentTarget.style.opacity = '0.85';
  };
  const onLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (outline) e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.opacity = disabled ? '0.5' : '1';
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}
      style={buttonStyle} onPointerEnter={onHover} onPointerLeave={onLeave}
      aria-label={ariaLabel} title={title}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}