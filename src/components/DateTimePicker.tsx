import { useState, useId, useRef, useEffect } from 'react'
import type { Theme } from '../themes/theme'
import {CalendarIcon, ClockIcon, DateTimeIcon, IcoX} from "./icons";

interface DateTimePickerProps {
  label: string
  theme: Theme
  value: string
  onChange: (val: string) => void
  enableDate?: boolean
  enableTime?: boolean
  disabled?: boolean
  error?: string
}

export default function DateTimePicker({
  label, theme: t, value, onChange,
  enableDate = true, enableTime = true,
  disabled = false, error,
}: DateTimePickerProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  const uid = useId()
  const cls = 'dtp' + uid.replace(/[^a-z0-9]/gi, '')
  const id = uid + 'input'

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const type = enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time'
  const floated = focused || value.length > 0
  const textColor = !focused && !value ? 'transparent' : t.text

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.focus()
    try {
      ;(inputRef.current as any)?.showPicker?.()
    } catch {
    }
  }

  const PickerIcon = type === 'date' ? CalendarIcon : type === 'time' ? ClockIcon : DateTimeIcon

  return (
    <div style={{ width: '100%' }}>
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
          onFocus={() => { if (!disabled) setFocused(true) }}
          onBlur={() => setFocused(false)}
          onChange={e => { if (!disabled) onChange(e.target.value) }}
          className={cls}
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: value ? '18px 70px 8px 16px' : '18px 46px 8px 16px',
            fontSize: 15, color: textColor, outline: 'none',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease, color 0.15s ease, padding 0.15s ease',
            boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit',
            colorScheme: t.bg.startsWith('#0') || t.bg.startsWith('#1') ? 'dark' : 'light',
            height: '50px',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          autoComplete="off"
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
              onClick={() => { if (!disabled) onChange('') }}
              disabled={disabled}
              style={{
                width: 28, height: 28, background: 'transparent', border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.iconColor, borderRadius: 6, transition: 'color 0.15s', padding: 0,
                opacity: disabled ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = t.text }}
              onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = t.iconColor }}
            >
              <IcoX s={14} />
            </button>
          )}
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            style={{
              width: 28, height: 28, background: 'transparent', border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: focused ? t.accent : t.iconColor,
              borderRadius: 6, transition: 'color 0.15s', padding: 0,
              opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = t.accent }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = focused ? t.accent : t.iconColor }}
          >
            <PickerIcon />
          </button>
        </div>
      </div>

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}