import { useState } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoCheck } from '../icons';

interface CheckboxProps {
  label: string;
  theme: Theme;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export default function Checkbox({
  label,
  theme: t,
  checked,
  onChange,
  description,
  disabled,
}: CheckboxProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        minHeight: 44,
        padding: '8px 0',
      }}
    >
      {/* Настоящий input — клавиатура, скринридер, фокус из коробки */}
      <input
        type="checkbox"
        checked={checked}
        onChange={e => {
          if (!disabled) onChange(e.target.checked);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          flexShrink: 0,
          marginTop: 1,
          border: `1.5px solid ${checked ? t.accent : t.border}`,
          background: checked ? t.accent : 'transparent',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: focused
            ? `0 0 0 3px ${t.accentGlow}, 0 0 0 1.5px ${t.accent}`
            : checked
              ? `0 0 0 3px ${t.accentGlow}`
              : 'none',
          touchAction: 'manipulation',
        }}
      >
        <IcoCheck
          s={11}
          style={{
            opacity: checked ? 1 : 0,
            transform: checked ? 'scale(1)' : 'scale(0.5)',
            transition:
              'opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </span>
      <span>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            color: t.text,
            lineHeight: 1.4,
          }}
        >
          {label}
        </span>
        {description && (
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: t.placeholder,
              marginTop: 2,
            }}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
}