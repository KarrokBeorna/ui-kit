import { useState, useId } from 'react'
import type { Theme } from '../themes/themes'

interface DateTimePickerProps {
  label: string
  theme: Theme
  value: string
  onChange: (val: string) => void
  enableDate?: boolean
  enableTime?: boolean
  onToggleDate?: (v: boolean) => void
  onToggleTime?: (v: boolean) => void
  error?: string
}

function Toggle({ active, onChange, label, t }: { active: boolean; onChange: (v: boolean) => void; label: string; t: Theme }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!active)}
        style={{
          width: 34, height: 18, borderRadius: 9,
          background: active ? t.toggleActive : t.toggleBg,
          position: 'relative', transition: 'background 0.22s ease', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: active ? 18 : 2, width: 14, height: 14,
          borderRadius: '50%', background: '#ffffff',
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
      </div>
      <span style={{ fontSize: 12, color: t.placeholder }}>{label}</span>
    </label>
  )
}

export default function DateTimePicker({
  label, theme: t, value, onChange,
  enableDate = true, enableTime = true,
  onToggleDate, onToggleTime, error,
}: DateTimePickerProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()

  const type = enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time'
  const floated = focused || value.length > 0
  // Hide browser's built-in placeholder (dd.mm.yyyy --:--) when empty and unfocused
  const textColor = (!focused && !value) ? 'transparent' : t.text

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.inputBg,
            border: `1.5px solid ${error ? '#ef4444' : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '18px 44px 8px 16px',
            fontSize: 15, color: textColor, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease, color 0.15s ease',
            boxShadow: focused ? `0 0 0 3px ${t.borderFocus}22` : 'none',
            fontFamily: 'inherit',
            colorScheme: t.bg.startsWith('#0') || t.bg.startsWith('#1') ? 'dark' : 'light',
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

      <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingLeft: 4 }}>
        {onToggleDate && <Toggle active={enableDate} onChange={onToggleDate} label="Дата" t={t} />}
        {onToggleTime && <Toggle active={enableTime} onChange={onToggleTime} label="Время" t={t} />}
      </div>

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
