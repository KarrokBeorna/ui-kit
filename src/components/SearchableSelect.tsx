import { useState, useId, useRef, useEffect } from 'react'
import type { Theme } from '../themes/themes'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  label: string
  theme: Theme
  options: SelectOption[]
  value: string
  onChange: (val: string) => void
  error?: string
}

export default function SearchableSelect({
  label, theme: t, options, value, onChange, error,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)
  const floated = focused || open || !!selected
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery(''); setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(true); setFocused(true); setQuery('')
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value); setOpen(false); setQuery(''); setFocused(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(''); setOpen(false); setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleOpen}>
        <input
          ref={inputRef}
          id={id}
          value={open ? query : (selected?.label ?? '')}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (!open) handleOpen() }}
          readOnly={!open}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.inputBg,
            border: `1.5px solid ${error ? '#ef4444' : open ? t.borderFocus : t.border}`,
            borderRadius: open ? '10px 10px 0 0' : 10,
            padding: '18px 68px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            cursor: open ? 'text' : 'pointer',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease, border-radius 0.15s ease',
            boxShadow: open ? `0 0 0 3px ${t.borderFocus}22` : 'none',
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

        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {value && (
            <button
              type="button"
              onMouseDown={handleClear}
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
          <div style={{ color: t.iconColor, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.22s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown — only render in DOM when open (avoids stray border) */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: t.dropdownBg,
          border: `1.5px solid ${t.borderFocus}`,
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          zIndex: 100, maxHeight: 240, overflowY: 'auto',
          boxShadow: t.shadow,
          animation: 'dropDown 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', color: t.placeholder, fontSize: 14 }}>Ничего не найдено</div>
          ) : filtered.map(opt => (
            <div
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
              style={{
                padding: '11px 16px', fontSize: 14, cursor: 'pointer',
                color: opt.value === value ? t.dropdownSelectedText : t.text,
                background: opt.value === value ? t.dropdownSelected : 'transparent',
                transition: 'background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = t.dropdownHover }}
              onMouseLeave={e => { e.currentTarget.style.background = opt.value === value ? t.dropdownSelected : 'transparent' }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: `1.5px solid ${opt.value === value ? t.accent : t.border}`,
                background: opt.value === value ? t.accent : 'transparent',
                transition: 'all 0.15s', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {opt.value === value && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              {opt.label}
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
