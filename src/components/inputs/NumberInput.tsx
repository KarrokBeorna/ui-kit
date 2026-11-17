import { useState, useId, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoX, IcoArrowUp, IcoArrowDown } from '../icons';
import {
  getInputStyle,
  FloatingLabel,
  FieldActions,
  FieldError,
} from './_shared/field';

interface NumberInputProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  disabled?: boolean;
}

export default function NumberInput({
  label,
  theme: t,
  value,
  onChange,
  allowDecimal = true,
  min,
  max,
  step,
  error,
  disabled = false,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const floated = focused || String(value).length > 0;

  const handleChange = (raw: string) => {
    if (disabled) return;
    if (raw === '' || raw === '-') {
      onChange(raw);
      return;
    }
    const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (pattern.test(raw)) onChange(raw);
  };

  const step_ = (dir: 1 | -1) => {
    if (disabled) return;
    const cur = parseFloat(value) || 0;
    const inc = step ?? (allowDecimal ? 0.1 : 1);
    let next = Math.round((cur + dir * inc) * 1e10) / 1e10;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(next));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setTimeout(() => {
      inputRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  };

  const stepperStyle: React.CSSProperties = {
    width: 22,
    height: 16,
    background: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 0,
    color: t.iconColor,
    transition: 'color 0.15s',
    opacity: disabled ? 0.5 : 1,
    touchAction: 'manipulation',
  };

  const hoverOn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.accent;
  };
  const hoverOff = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.iconColor;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={value}
          onFocus={() => {
            if (!disabled) setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={e => handleChange(e.target.value)}
          placeholder=""
          disabled={disabled}
          style={getInputStyle(t, {
            error,
            focused,
            disabled,
            padding: '18px 80px 8px 16px',
          })}
          autoComplete="off"
        />
        <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} />

        <FieldActions>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Очистить"
              style={{
                width: 24,
                height: 24,
                background: 'transparent',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.iconColor,
                borderRadius: 4,
                transition: 'color 0.15s',
                padding: 0,
                opacity: disabled ? 0.5 : 1,
                touchAction: 'manipulation',
              }}
              onPointerEnter={e => {
                if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.text;
              }}
              onPointerLeave={e => {
                if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.iconColor;
              }}
            >
              <IcoX s={12} />
            </button>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              marginLeft: value ? 2 : 0,
            }}
          >
            <button
              type="button"
              onPointerDown={e => {
                e.preventDefault();
                step_(1);
              }}
              disabled={disabled}
              aria-label="Увеличить"
              style={stepperStyle}
              onPointerEnter={hoverOn}
              onPointerLeave={hoverOff}
            >
              <IcoArrowUp s={12} />
            </button>
            <button
              type="button"
              onPointerDown={e => {
                e.preventDefault();
                step_(-1);
              }}
              disabled={disabled}
              aria-label="Уменьшить"
              style={stepperStyle}
              onPointerEnter={hoverOn}
              onPointerLeave={hoverOff}
            >
              <IcoArrowDown s={12} />
            </button>
          </div>
        </FieldActions>
      </div>
      <FieldError error={error} t={t} />
    </div>
  );
}