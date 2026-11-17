import { useState, useId, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoEye } from '../icons';
import {
  getInputStyle,
  FloatingLabel,
  FieldActions,
  ClearButton,
  IconActionButton,
  FieldError,
} from './_shared/field';

function StrengthBar({ value, t }: { value: string; t: Theme }) {
  const score = (() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^a-zA-Z0-9]/.test(value)) s++;
    return s;
  })();
  const levels = [
    { label: 'Слабый', color: t.danger },
    { label: 'Слабый', color: t.danger },
    { label: 'Средний', color: '#f59e0b' },
    { label: 'Хороший', color: '#22c55e' },
    { label: 'Сильный', color: '#10b981' },
  ];
  if (!value) return null;
  const { label, color } = levels[score];
  return (
    <div style={{ marginTop: 8, paddingLeft: 2 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= score ? color : t.border,
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

interface PasswordInputProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  showStrength?: boolean;
  disabled?: boolean;
}

export default function PasswordInput({
  label,
  theme: t,
  value,
  onChange,
  error,
  showStrength = false,
  disabled = false,
}: PasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const floated = focused || String(value).length > 0;

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setTimeout(() => {
      inputRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onFocus={() => {
            if (!disabled) setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={e => {
            if (!disabled) onChange(e.target.value);
          }}
          placeholder=""
          disabled={disabled}
          style={{
            ...getInputStyle(t, {
              error,
              focused,
              disabled,
              padding: '18px 76px 8px 16px',
            }),
            letterSpacing: visible ? 'normal' : value ? '2px' : 'normal',
          }}
          autoComplete="new-password"
        />
        <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} />

        <FieldActions>
          {value && (
            <ClearButton onClick={handleClear} t={t} disabled={disabled} size={12} />
          )}
          <IconActionButton
            onClick={() => {
              if (!disabled) setVisible(v => !v);
            }}
            t={t}
            disabled={disabled}
            active={visible}
            activeColor={t.accent}
            ariaLabel={visible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <IcoEye s={18} off={!visible} />
          </IconActionButton>
        </FieldActions>
      </div>
      {showStrength && <StrengthBar value={value} t={t} />}
      <FieldError error={error} t={t} />
    </div>
  );
}