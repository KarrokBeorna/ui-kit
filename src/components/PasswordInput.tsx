import { useState, useId } from 'react';
import type { Theme } from '../themes/theme';
import { IcoEye, IcoX } from './icons';

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
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : t.border,
            transition: 'background 0.3s ease',
          }} />
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
  /** Показывать индикатор сложности пароля (по умолчанию true) */
  showStrength?: boolean;
}

export default function PasswordInput({
  label,
  theme: t,
  value,
  onChange,
  error,
  showStrength = true,
}: PasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const id = useId();
  const floated = focused || value.length > 0;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 76px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit',
            letterSpacing: visible ? 'normal' : value ? '2px' : 'normal',
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: 'absolute', left: 14,
            top: floated ? 0 : '50%',
            transform: floated ? 'translateY(-50%) scale(0.78)' : 'translateY(-50%)',
            transformOrigin: 'left center',
            color: error ? t.danger : floated ? t.labelFloat : t.placeholder,
            fontSize: 15, pointerEvents: 'none',
            transition: 'top 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1), color 0.22s ease',
            background: floated ? t.labelBg : 'transparent',
            padding: floated ? '0 4px' : '0',
            borderRadius: 3, lineHeight: 1, whiteSpace: 'nowrap', zIndex: 1,
            letterSpacing: 'normal',
          }}
        >
          {label}
        </label>

        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                width: 28, height: 28, background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.iconColor, borderRadius: 6, transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = t.text)}
              onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
            >
              <IcoX s={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            style={{
              width: 28, height: 28, background: 'transparent', border: 'none',
              cursor: 'pointer', padding: 4,
              color: visible ? t.accent : t.iconColor,
              transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            <IcoEye s={18} off={!visible} />
          </button>
        </div>
      </div>
      {showStrength && <StrengthBar value={value} t={t} />}
      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}