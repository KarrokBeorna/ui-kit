// RadioGroup.tsx — группа радиокнопок (нативные input, уникальное name).
import { useId, useState } from 'react';
import type { Theme } from '../themes/theme';

export interface RadioOption { value: string; label: string; description?: string; }

export interface RadioGroupProps {
  /** Заголовок группы. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /** Опции. */
  options: RadioOption[];
  /** Выбранное значение. */
  value: string;
  /** Колбэк выбора. */
  onChange: (val: string) => void;
  /** Раскладка. @default 'vertical' */
  direction?: 'horizontal' | 'vertical';
  /** Текст ошибки. */
  error?: string;
  /** Блокировка всей группы. */
  disabled?: boolean;
}

/** Радиогруппа с нативной клавиатурной навигацией стрелками. */
export default function RadioGroup({
  label, theme: t, options, value, onChange,
  direction = 'vertical', error, disabled = false,
}: RadioGroupProps) {
  const name = useId();
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  return (
    <div style={{ width: '100%', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder, marginBottom: 12 }}>
        {label}
      </div>
      <div role="radiogroup" aria-label={label} style={{
        display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: direction === 'horizontal' ? 20 : 4, flexWrap: direction === 'horizontal' ? 'wrap' : 'nowrap',
      }}>
        {options.map((opt) => {
          const selected = value === opt.value;
          const focused = focusedValue === opt.value;
          return (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
              minHeight: 44, padding: '8px 0',
            }}>
              <input
                type="radio" name={name} value={opt.value} checked={selected} disabled={disabled}
                onChange={() => { if (!disabled) onChange(opt.value); }}
                onFocus={(e) => { try { if (e.currentTarget.matches(':focus-visible')) setFocusedValue(opt.value); } catch { setFocusedValue(opt.value); } }}
                onBlur={() => setFocusedValue(null)}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              />
              <span aria-hidden style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${selected ? t.accent : t.border}`, background: 'transparent',
                transition: 'border-color 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: focused ? `0 0 0 3px ${t.accentGlow}, 0 0 0 1.5px ${t.accent}`
                  : selected ? `0 0 0 3px ${t.accentGlow}` : 'none',
                touchAction: 'manipulation',
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: t.accent,
                  transform: selected ? 'scale(1)' : 'scale(0)',
                  transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 14, color: t.text, lineHeight: 1.4 }}>{opt.label}</span>
                {opt.description && (
                  <span style={{ display: 'block', fontSize: 12, color: t.placeholder, marginTop: 2 }}>{opt.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p style={{ margin: '8px 0 0 0', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}