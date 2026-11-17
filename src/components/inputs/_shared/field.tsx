import React from 'react';
import type { Theme } from '../../../themes/theme';
import { IcoX } from '../../icons';

export const FIELD_HEIGHT = 50;
/** iOS Safari зумит страницу при focus, если шрифт < 16px */
export const INPUT_FONT_SIZE = 16;

export function getInputStyle(
  t: Theme,
  {
    error,
    focused,
    disabled,
    padding = '18px 56px 8px 16px',
    borderRadius = 10,
  }: {
    error?: string;
    focused: boolean;
    disabled?: boolean;
    padding?: string;
    borderRadius?: number | string;
  }
): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: t.bg,
    border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
    borderRadius,
    padding,
    fontSize: INPUT_FONT_SIZE,
    color: t.text,
    outline: 'none',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, border-radius 0.15s ease',
    boxShadow: focused ? `0 0 0 3px ${error ? '#ef444422' : t.accentGlow}` : 'none',
    fontFamily: 'inherit',
    height: FIELD_HEIGHT,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    touchAction: 'manipulation',
  };
}

export function FloatingLabel({
  htmlFor,
  label,
  floated,
  error,
  t,
  textarea = false,
}: {
  htmlFor: string;
  label: string;
  floated: boolean;
  error?: string;
  t: Theme;
  textarea?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        position: 'absolute',
        left: 14,
        top: floated ? 0 : textarea ? 20 : '50%',
        transform: floated
          ? 'translateY(-50%) scale(0.78)'
          : textarea
            ? 'translateY(0)'
            : 'translateY(-50%)',
        transformOrigin: 'left center',
        color: error ? t.danger : floated ? t.labelFloat : t.placeholder,
        fontSize: INPUT_FONT_SIZE,
        pointerEvents: 'none',
        transition:
          'top 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1), color 0.22s ease',
        background: floated ? t.labelBg : 'transparent',
        padding: floated ? '0 4px' : '0',
        borderRadius: 3,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        zIndex: 1,
      }}
    >
      {label}
    </label>
  );
}

export function FieldActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Компактная иконочная кнопка. По умолчанию 28×28 — как в оригинальных
 * компонентах. Для touch-таргета можно прокинуть size={40}, но это раздувает
 * поле. По умолчанию — компакт.
 */
export function IconActionButton({
  onClick,
  onPointerDown,
  onMouseDown,
  t,
  disabled,
  active,
  activeColor,
  children,
  ariaLabel,
  size = 28,
  round = 6,
  stopPropagation = false,
  preventMouseDown = false,
}: {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  t: Theme;
  disabled?: boolean;
  active?: boolean;
  activeColor?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  size?: number;
  round?: number;
  stopPropagation?: boolean;
  preventMouseDown?: boolean;
}) {
  const baseColor = active ? activeColor || t.accent : t.iconColor;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={e => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      onPointerDown={onPointerDown}
      onMouseDown={e => {
        if (stopPropagation) e.stopPropagation();
        if (preventMouseDown) e.preventDefault();
        onMouseDown?.(e);
      }}
      style={{
        width: size,
        height: size,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: baseColor,
        borderRadius: round,
        transition: 'color 0.15s, background 0.15s',
        padding: 0,
        opacity: disabled ? 0.5 : 1,
        touchAction: 'manipulation',
      }}
      onPointerEnter={e => {
        if (e.pointerType === 'mouse' && !disabled) {
          e.currentTarget.style.color = t.text;
          e.currentTarget.style.background = t.navHoverBg;
        }
      }}
      onPointerLeave={e => {
        if (e.pointerType === 'mouse' && !disabled) {
          e.currentTarget.style.color = baseColor;
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

export function ClearButton({
  onClick,
  t,
  disabled,
  size = 14,
  ariaLabel = 'Очистить',
  stopPropagation = false,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  t: Theme;
  disabled?: boolean;
  size?: number;
  ariaLabel?: string;
  stopPropagation?: boolean;
}) {
  return (
    <IconActionButton
      onClick={onClick}
      t={t}
      disabled={disabled}
      ariaLabel={ariaLabel}
      stopPropagation={stopPropagation}
      preventMouseDown={stopPropagation}
    >
      <IcoX s={size} />
    </IconActionButton>
  );
}

export function FieldError({ error, t }: { error?: string; t: Theme }) {
  if (!error) return null;
  return <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>;
}