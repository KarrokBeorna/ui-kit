import { useState, useId } from 'react'
import type { Theme } from '../themes/themes'

interface TextareaProps {
  label: string
  theme: Theme
  value: string
  onChange: (val: string) => void
  rows?: number
  maxLength?: number
  error?: string
}

export default function Textarea({
  label, theme: t, value, onChange, rows = 4, maxLength, error,
}: TextareaProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const floated = focused || value.length > 0

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <textarea
          id={id}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.inputBg,
            border: `1.5px solid ${error ? '#ef4444' : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '22px 40px 10px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.borderFocus}22` : 'none',
            fontFamily: 'inherit', lineHeight: 1.6,
            minHeight: 80,
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: 'absolute', left: 14,
            top: floated ? 0 : 20,
            transform: floated ? 'translateY(-50%) scale(0.78)' : 'translateY(0)',
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
              position: 'absolute', right: 10, top: 12,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.iconColor, padding: 4, display: 'flex', alignItems: 'center',
              transition: 'color 0.15s', borderRadius: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        {maxLength && (
          <span style={{ fontSize: 11, color: value.length >= maxLength ? '#ef4444' : t.placeholder }}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {error && <p style={{ margin: '2px 0 0 4px', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
