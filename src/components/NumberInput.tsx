import { useState, useId } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX, IcoArrowUp, IcoArrowDown } from './icons';

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
}

export default function NumberInput({
  label, theme: t, value, onChange,
  allowDecimal = true, min, max, step, error,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const floated = focused || value.length > 0;

  const handleChange = (raw: string) => {
    if (raw === '' || raw === '-') { onChange(raw); return; }
    const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (pattern.test(raw)) onChange(raw);
  };

  const step_ = (dir: 1 | -1) => {
    const cur = parseFloat(value) || 0;
    const inc = step ?? (allowDecimal ? 0.1 : 1);
    let next = Math.round((cur + dir * inc) * 1e10) / 1e10;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(next));
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => handleChange(e.target.value)}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 80px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit',
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
                width: 24, height: 24, background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.iconColor, borderRadius: 4, transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = t.text)}
              onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
            >
              <IcoX s={12} />
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); step_(1); }}
              style={{
                width: 22, height: 16, background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, padding: 0, color: t.iconColor, transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = t.accent)}
              onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
            >
              <IcoArrowUp s={12} />
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); step_(-1); }}
              style={{
                width: 22, height: 16, background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, padding: 0, color: t.iconColor, transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = t.accent)}
              onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
            >
              <IcoArrowDown s={12} />
            </button>
          </div>
        </div>
      </div>
      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}