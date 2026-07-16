import { useState, useId } from 'react'
import type { Theme } from '../themes/themes'

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )
}

function StrengthBar({ value, t }: { value: string; t: Theme }) {
  const score = (() => {
    if (!value) return 0
    let s = 0
    if (value.length >= 8) s++
    if (/[A-Z]/.test(value)) s++
    if (/[0-9]/.test(value)) s++
    if (/[^a-zA-Z0-9]/.test(value)) s++
    return s
  })()
  const levels = [
    { label: 'Слабый', color: '#ef4444' },
    { label: 'Слабый', color: '#ef4444' },
    { label: 'Средний', color: '#f59e0b' },
    { label: 'Хороший', color: '#22c55e' },
    { label: 'Сильный', color: '#10b981' },
  ]
  if (!value) return null
  const { label, color } = levels[score]
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
  )
}

interface PasswordInputProps {
  label: string
  theme: Theme
  value: string
  onChange: (val: string) => void
  error?: string
}

export default function PasswordInput({ label, theme: t, value, onChange, error }: PasswordInputProps) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const id = useId()
  const floated = focused || value.length > 0

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
            background: t.inputBg,
            border: `1.5px solid ${error ? '#ef4444' : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 76px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.borderFocus}22` : 'none',
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
            color: error ? '#ef4444' : floated ? t.labelFloat : t.placeholder,
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
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
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
            <EyeIcon open={visible} />
          </button>
        </div>
      </div>
      <StrengthBar value={value} t={t} />
      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
