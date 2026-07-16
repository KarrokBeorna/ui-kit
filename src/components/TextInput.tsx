import { useState, useId, type ChangeEvent } from 'react'
import type { Theme } from '../themes/themes'

export type TextInputType = 'text' | 'email' | 'tel'

const TYPE_OPTIONS: { value: TextInputType; label: string; icon: string }[] = [
  { value: 'text', label: 'Текст', icon: 'T' },
  { value: 'email', label: 'E-mail', icon: '@' },
  { value: 'tel', label: 'Телефон', icon: '+' },
]

interface TextInputProps {
  label: string
  theme: Theme
  value: string
  onChange: (val: string) => void
  inputType?: TextInputType
  onTypeChange?: (t: TextInputType) => void
  error?: string
}

export default function TextInput({
  label, theme: t, value, onChange,
  inputType = 'text', onTypeChange, error,
}: TextInputProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const floated = focused || value.length > 0

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={inputType}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.inputBg,
            border: `1.5px solid ${error ? '#ef4444' : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 40px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.borderFocus}22` : 'none',
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
            color: error ? '#ef4444' : floated ? t.labelFloat : t.placeholder,
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
            onClick={() => onChange('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.iconColor, padding: 4, display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        )}
      </div>

      {onTypeChange && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingLeft: 2 }}>
          {TYPE_OPTIONS.map(opt => {
            const active = inputType === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onTypeChange(opt.value); onChange('') }}
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
            )
          })}
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
