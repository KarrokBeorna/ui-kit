import React from 'react';
import {Theme} from '../../themes/theme';

interface ButtonProps {
  icon?: React.ReactNode;
  children?: string;
  variant: 'primary' | 'danger' | 'success';
  outline?: boolean;
  size?: 'sm' | 'md';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  theme: Theme;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

export default function Button({
  icon,
  children,
  variant = 'primary',
  outline = false,
  size = 'md',
  onClick,
  disabled = false,
  theme,
  type = 'button',
  className = '',
  style = {},
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  const getColors = () => {
    if (isDanger) {
      return outline
        ? {
            background: 'transparent',
            color: theme.danger,
            border: `1px solid ${theme.danger}`,
            hoverBackground: `${theme.danger}15`,
            hoverOpacity: 1,
          }
        : {
            background: theme.danger,
            color: '#ffffff',
            border: 'none',
            hoverBackground: undefined,
            hoverOpacity: 0.85,
          };
    }

    if (isSuccess) {
      return outline
        ? {
            background: 'transparent',
            color: `${theme.success}`,
            border: `1px solid ${theme.success}`,
            hoverBackground: `${theme.success}15`,
            hoverOpacity: 1,
          }
        : {
            background: `${theme.success}`,
            color: '#ffffff',
            border: 'none',
            hoverBackground: undefined,
            hoverOpacity: 0.85,
          };
    }

    return outline
      ? {
          background: 'transparent',
          color: theme.accent,
          border: `1px solid ${theme.accent}`,
          hoverBackground: `${theme.accent}15`,
          hoverOpacity: 1,
        }
      : {
          background: theme.accent,
          color: theme.accentText,
          border: 'none',
          hoverBackground: undefined,
          hoverOpacity: 0.85,
        };
  };

  const colors = getColors();

  const sizeStyles = size === 'sm'
    ? { padding: '4px 10px', fontSize: '12px', gap: '5px' }
    : { padding: '8px 20px', fontSize: '13px', gap: '8px' };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontFamily: 'system-ui',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s, opacity 0.15s, box-shadow 0.15s',
    ...sizeStyles,
    background: colors.background,
    color: colors.color,
    border: colors.border,
    opacity: disabled ? 0.5 : 1,
    ...(isPrimary && !outline ? { boxShadow: `0 2px 14px ${theme.accentGlow}` } : {}),
    ...style,
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (outline) {
      e.currentTarget.style.background = colors.hoverBackground || 'transparent';
    } else {
      e.currentTarget.style.opacity = String(colors.hoverOpacity);
    }
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (outline) {
      e.currentTarget.style.background = 'transparent';
    } else {
      e.currentTarget.style.opacity = '1';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={buttonStyle}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
    >
      {icon && <span style={{ display: 'inline-flex', marginRight: children ? (size === 'sm' ? 4 : 6) : 0 }}>{icon}</span>}
      {children}
    </button>
  );
};