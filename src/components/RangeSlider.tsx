// RangeSlider.tsx
import { useState, useRef, useId } from 'react'
import type { Theme } from '../themes/theme'
import { IcoX } from './icons'

// ─── Single-value mode ───────────────────────────────────────────────────────
interface SingleProps {
  range?: false
  value: number
  onChange: (v: number) => void
}

// ─── Range mode (with optional null bounds) ────────────────────────────────
interface RangeProps {
  range: true
  value: [number | null, number | null]
  onChange: (v: [number | null, number | null]) => void
}

type RangeSliderProps = (SingleProps | RangeProps) & {
  label: string
  theme: Theme
  min?: number
  max?: number
  step?: number
  formatValue?: (v: number | null) => string
  parseValue?: (s: string) => number | null
  disabled?: boolean
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function snap(v: number, min: number, step: number) {
  return Math.round((v - min) / step) * step + min
}

function pct(v: number, min: number, max: number) {
  return ((v - min) / (max - min)) * 100
}

// ─── Mini number input for manual entry ──────────────────────────────────────
function ManualInput({
  value,
  onCommit,
  format,
  parse,
  t,
  label,
  disabled,
}: {
  value: number | null
  onCommit: (v: number | null) => void
  format: (v: number | null) => string
  parse: (s: string) => number | null
  t: Theme
  label?: string
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  const startEdit = () => {
    if (disabled) return
    setEditing(true)
    setRaw(value !== null ? String(value) : '')
  }

  const commit = () => {
    setEditing(false)
    const trimmed = raw.trim()
    if (trimmed === '') {
      onCommit(null)
      return
    }
    const n = parse(trimmed)
    if (n !== null) onCommit(n)
    // if parse fails, keep previous value (no change)
  }

  const handleClear = () => {
    if (disabled) return
    setEditing(false)
    onCommit(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 72 }}>
      {label && (
        <span style={{ fontSize: 10, color: t.placeholder, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          value={editing ? raw : format(value)}
          onFocus={startEdit}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          disabled={disabled}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${editing ? t.borderFocus : t.border}`,
            borderRadius: 8,
            padding: '6px 28px 6px 10px',
            fontSize: 13,
            fontWeight: 600,
            color: t.accent,
            outline: 'none',
            textAlign: 'center',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: editing ? `0 0 0 3px ${t.borderFocus}22` : 'none',
            fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {value !== null && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.iconColor,
              borderRadius: 4,
              transition: 'color 0.15s',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
          >
            <IcoX s={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RangeSlider(props: RangeSliderProps) {
  const {
    label,
    theme: t,
    min = 0,
    max = 100,
    step = 1,
    formatValue = (v) => (v !== null ? String(v) : ''),
    parseValue,
    disabled = false,
  } = props

  const defaultParse = (s: string) => {
    const n = parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '.'))
    return isNaN(n) ? null : clamp(snap(n, min, step), min, max)
  }
  const parse = parseValue ?? defaultParse

  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'lo' | 'hi' | null>(null)
  const [focusedThumb, setFocusedThumb] = useState<'lo' | 'hi' | null>(null)

  // Derive lo/hi from props
  const isRange = props.range === true
  const lo = isRange ? (props as RangeProps).value[0] : (props as SingleProps).value
  const hi = isRange ? (props as RangeProps).value[1] : (props as SingleProps).value

  // ─── Изменённые функции установки значений ────────────────────────────────
  const setLo = (v: number | null) => {
    if (disabled) return
    if (isRange) {
      if (v === null) {
        ;(props as RangeProps).onChange([null, hi])
      } else {
        const upper = hi !== null ? hi : max
        const clamped = clamp(v, min, upper)
        ;(props as RangeProps).onChange([clamped, hi])
      }
    } else {
      ;(props as SingleProps).onChange(clamp(v as number, min, max))
    }
  }

  const setHi = (v: number | null) => {
    if (disabled || !isRange) return
    if (v === null) {
      ;(props as RangeProps).onChange([lo, null])
    } else {
      const lower = lo !== null ? lo : min
      const clamped = clamp(v, lower, max)
      ;(props as RangeProps).onChange([lo, clamped])
    }
  }

  const pctLo = lo !== null ? pct(lo, min, max) : 0
  const pctHi = hi !== null ? pct(hi, min, max) : 100

  const valueFromEvent = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return lo !== null ? lo : min
    const raw = (clientX - rect.left) / rect.width
    return clamp(snap(raw * (max - min) + min, min, step), min, max)
  }

  const startDrag = (thumb: 'lo' | 'hi') => (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    dragging.current = thumb
    const move = (ev: MouseEvent) => {
      const v = valueFromEvent(ev.clientX)
      if (dragging.current === 'lo') {
        setLo(v)
      } else if (dragging.current === 'hi') {
        setHi(v)
      }
    }
    const up = () => {
      dragging.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  // ─── Обновлённая обработка клика по треку ──────────────────────────────────
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || dragging.current) return
    const v = valueFromEvent(e.clientX)

    if (!isRange) {
      setLo(v)
      return
    }

    // Режим диапазона
    if (lo === null) {
      // Первый клик – устанавливаем левую границу
      setLo(v)
    } else if (hi === null) {
      // Второй клик – устанавливаем правую границу
      setHi(v)
    } else {
      // Обе границы существуют – выбираем ближайшую
      const distLo = Math.abs(v - lo)
      const distHi = Math.abs(v - hi)
      if (distLo <= distHi) {
        setLo(Math.min(v, hi))
      } else {
        setHi(Math.max(v, lo))
      }
    }
  }

  const thumbStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: t.accent,
    border: `3px solid ${t.bg}`,
    boxShadow: active
      ? `0 0 0 4px ${t.accent}44, 0 2px 8px ${t.accent}55`
      : `0 2px 6px ${t.accent}55`,
    cursor: disabled ? 'not-allowed' : 'grab',
    transition: 'box-shadow 0.2s ease',
    outline: 'none',
    zIndex: active ? 3 : 2,
    opacity: disabled ? 0.5 : 1,
  })

  const keyDown = (thumb: 'lo' | 'hi') => (e: React.KeyboardEvent) => {
    if (disabled || !isRange) return
    const isLo = thumb === 'lo'
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (isLo) {
        if (lo !== null) {
          const newVal = Math.min(lo + step, hi !== null ? hi : max)
          setLo(newVal)
        }
      } else {
        if (hi !== null) {
          const newVal = Math.min(hi + step, max)
          setHi(newVal)
        }
      }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (isLo) {
        if (lo !== null) {
          const newVal = Math.max(lo - step, min)
          setLo(newVal)
        }
      } else {
        if (hi !== null) {
          const newVal = Math.max(hi - step, lo !== null ? lo : min)
          setHi(newVal)
        }
      }
    }
  }

  return (
    <div style={{ width: '100%', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: t.placeholder,
          }}
        >
          {label}
        </span>
        {isRange && (
          <button
            type="button"
            onClick={() => { if (!disabled) (props as RangeProps).onChange([null, null]) }}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              color: t.placeholder,
              fontSize: 11,
              cursor: disabled ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
              padding: 0,
              opacity: disabled ? 0.5 : 1,
            }}
            title="Очистить оба значения"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Track */}
      <div style={{ position: 'relative' }}>
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ position: 'relative', height: 6, borderRadius: 3, background: t.border, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {/* Fill bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${t.accent}88, ${t.accent})`,
              left: lo !== null ? `${pctLo}%` : '0%',
              right: hi !== null ? `${100 - pctHi}%` : '0%',
              transition: 'left 0.03s, right 0.03s',
            }}
          />

          {/* Lo thumb (also the single thumb) – only if lo is not null */}
          {lo !== null && (
            <div
              style={{ ...thumbStyle(focusedThumb === 'lo'), left: `${pctLo}%` }}
              onMouseDown={startDrag('lo')}
              onFocus={() => { if (!disabled) setFocusedThumb('lo') }}
              onBlur={() => setFocusedThumb(null)}
              onKeyDown={isRange ? keyDown('lo') : undefined}
              tabIndex={disabled ? -1 : 0}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={isRange && hi !== null ? hi : max}
              aria-valuenow={lo}
            />
          )}

          {/* Hi thumb (range only) – only if hi is not null */}
          {isRange && hi !== null && (
            <div
              style={{ ...thumbStyle(focusedThumb === 'hi'), left: `${pctHi}%` }}
              onMouseDown={startDrag('hi')}
              onFocus={() => { if (!disabled) setFocusedThumb('hi') }}
              onBlur={() => setFocusedThumb(null)}
              onKeyDown={keyDown('hi')}
              tabIndex={disabled ? -1 : 0}
              role="slider"
              aria-valuemin={lo !== null ? lo : min}
              aria-valuemax={max}
              aria-valuenow={hi}
            />
          )}
        </div>

        {/* Min/max axis labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: t.placeholder }}>{formatValue(min)}</span>
          <span style={{ fontSize: 11, color: t.placeholder }}>{formatValue(max)}</span>
        </div>
      </div>

      {/* Manual inputs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: isRange ? 'space-between' : 'center',
        }}
      >
        <ManualInput
          value={lo}
          onCommit={(v) => setLo(isRange ? (v !== null ? Math.min(v, hi !== null ? hi : max) : null) : v)}
          format={formatValue}
          parse={parse}
          t={t}
          label={isRange ? 'От' : undefined}
          disabled={disabled}
        />
        {isRange && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: 9,
                color: t.placeholder,
                fontSize: 18,
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              —
            </div>
            <ManualInput
              value={hi}
              onCommit={(v) => setHi(v !== null ? Math.max(v, lo !== null ? lo : min) : null)}
              format={formatValue}
              parse={parse}
              t={t}
              label="До"
              disabled={disabled}
            />
          </>
        )}
      </div>
    </div>
  )
}