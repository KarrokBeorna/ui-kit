import { useState, useId, useRef } from 'react'
import type { Theme } from '../themes/theme'
import {CalendarIcon, ClockIcon, DateTimeIcon, IcoX} from "./icons";

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

function Toggle({ active, onChange, label, t }: {
  active: boolean; onChange: (v: boolean) => void; label: string; t: Theme
}) {
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
          position: 'absolute', top: 2, left: active ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#ffffff',
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
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  // Make a valid CSS class name from the useId output
  const cls = 'dtp' + uid.replace(/[^a-z0-9]/gi, '')
  const id = uid + 'input'

  const type = enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time'
  const floated = focused || value.length > 0
  const textColor = !focused && !value ? 'transparent' : t.text

  const openPicker = () => {
    inputRef.current?.focus()
    try {
      // showPicker() is supported in Chrome 99+, Firefox 101+, Safari 16+
      ;(inputRef.current as any)?.showPicker?.()
    } catch {
      // silently ignore in unsupported environments
    }
  }

  const PickerIcon = type === 'date' ? CalendarIcon : type === 'time' ? ClockIcon : DateTimeIcon

  return (
    <div style={{ width: '100%' }}>
      {/* Hide native browser calendar/clock indicator via scoped CSS */}
      <style>{`
        .${cls}::-webkit-calendar-picker-indicator {
          opacity: 0;
          pointer-events: none;
          position: absolute;
          width: 0;
          height: 0;
        }
        .${cls}::-webkit-inner-spin-button,
        .${cls}::-webkit-clear-button {
          display: none;
        }
      `}</style>

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          className={cls}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.inputBg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            // Right padding: clear(28) + gap(4) + picker-btn(28) + edge(10) = 70, else picker-btn(28)+edge(10) = 38
            padding: value ? '18px 70px 8px 16px' : '18px 46px 8px 16px',
            fontSize: 15, color: textColor, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease, color 0.15s ease, padding 0.15s ease',
            boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
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

        {/* Right-side button group: [× clear]  [picker icon] */}
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {/* Clear × — only visible when there's a value; sits to the LEFT of the picker icon */}
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
              <IcoX s={14} />
            </button>
          )}

          {/* Picker icon — always visible, opens native picker */}
          <button
            type="button"
            onClick={openPicker}
            style={{
              width: 28, height: 28, background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: focused ? t.accent : t.iconColor,
              borderRadius: 6, transition: 'color 0.15s', padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = focused ? t.accent : t.iconColor)}
          >
            <PickerIcon />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingLeft: 4 }}>
        {onToggleDate && <Toggle active={enableDate} onChange={onToggleDate} label="Дата" t={t} />}
        {onToggleTime && <Toggle active={enableTime} onChange={onToggleTime} label="Время" t={t} />}
      </div>

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  )
}
