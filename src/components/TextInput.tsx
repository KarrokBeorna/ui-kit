import { useState, useId, type ChangeEvent } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';

export type TextInputType = 'text' | 'email' | 'tel';

const TYPE_OPTIONS: { value: TextInputType; label: string; icon: string }[] = [
  { value: 'text',  label: 'Текст',   icon: 'T' },
  { value: 'email', label: 'E-mail',  icon: '@' },
  { value: 'tel',   label: 'Телефон', icon: '+' },
]

// Strip any character that is invalid for a phone number field
function sanitizeTel(raw: string) {
  return raw.replace(/[^\d+\-()\s]/g, '')
}

function validateOnBlur(value: string, type: TextInputType): string {
  if (!value) return ''
  if (type === 'email' && !value.includes('@')) return 'Обязателен символ @'
  if (type === 'tel') {
    if (!/[+\-]/.test(value)) return 'Обязателен символ + или −'
    if (!/\d/.test(value)) return 'Введите номер телефона'
  }
  return ''
}

interface TextInputProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  inputType?: TextInputType;
  onTypeChange?: (t: TextInputType) => void;
  error?: string;
}

export default function TextInput({
  label, theme: t, value, onChange,
  inputType = 'text', onTypeChange, error: externalError,
}: TextInputProps) {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const id = useId()
  const floated = focused || value.length > 0

  const internalError = touched ? validateOnBlur(value, inputType) : ''
  const error = externalError || internalError

  const handleChange = (raw: string) => {
    onChange(inputType === 'tel' ? sanitizeTel(raw) : raw)
  }

  const handleBlur = () => {
    setFocused(false)
    setTouched(true)
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={inputType === 'tel' ? 'text' : inputType}
          inputMode={inputType === 'tel' ? 'tel' : undefined}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onChange={e => handleChange(e.target.value)}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 40px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${error ? '#ef444422' : t.accentGlow}` : 'none',
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

        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setTouched(false) }}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.iconColor, padding: 4, display: 'flex', alignItems: 'center',
              transition: 'color 0.15s', borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
          >
            <IcoX s={14} />
          </button>
        )}
      </div>

      {/* Validation hint shown only when no error yet (pre-blur) */}
      {!error && inputType !== 'text' && (
        <p style={{ margin: '4px 0 0 4px', fontSize: 11, color: t.placeholder }}>
          {inputType === 'email' ? 'Обязателен символ @' : 'Только цифры, +, −, (), пробел'}
        </p>
      )}
      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}

      {onTypeChange && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingLeft: 2 }}>
          {TYPE_OPTIONS.map(opt => {
            const active = inputType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onTypeChange(opt.value); onChange(''); setTouched(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${active ? t.accent : t.border}`,
                  background: active ? `${t.accent}18` : 'transparent',
                  color: active ? t.accent : t.placeholder,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontFamily: 'inherit',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: active ? t.accent : t.border,
                  color: active ? t.accentText : t.placeholder,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, flexShrink: 0,
                  transition: 'all 0.18s ease',
                }}>
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}