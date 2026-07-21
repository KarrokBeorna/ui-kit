import { useState, useRef, useId } from 'react'
import type { Theme } from '../themes/themes'

// ─── Single-value mode ───────────────────────────────────────────────────────
interface SingleProps {
  range?: false
  value: number
  onChange: (v: number) => void
}

// ─── Range mode ──────────────────────────────────────────────────────────────
interface RangeProps {
  range: true
  value: [number, number]
  onChange: (v: [number, number]) => void
}

type RangeSliderProps = (SingleProps | RangeProps) & {
  label: string
  theme: Theme
  min?: number
  max?: number
  step?: number
  formatValue?: (v: number) => string
  parseValue?: (s: string) => number | null
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
  value, onCommit, format, parse, t, label,
}: {
  value: number
  onCommit: (v: number) => void
  format: (v: number) => string
  parse: (s: string) => number | null
  t: Theme
  label?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  const startEdit = () => { setEditing(true); setRaw(String(value)) }
  const commit = () => {
    setEditing(false)
    const n = parse(raw)
    if (n !== null) onCommit(n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 72 }}>
      {label && <span style={{ fontSize: 10, color: t.placeholder, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
      <input
        type="text"
        value={editing ? raw : format(value)}
        onFocus={startEdit}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit() }}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: t.inputBg,
          border: `1.5px solid ${editing ? t.borderFocus : t.border}`,
          borderRadius: 8, padding: '6px 10px',
          fontSize: 13, fontWeight: 600,
          color: t.accent, outline: 'none', textAlign: 'center',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: editing ? `0 0 0 3px ${t.borderFocus}22` : 'none',
          fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
        }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RangeSlider(props: RangeSliderProps) {
  const {
    label, theme: t, min = 0, max = 100, step = 1,
    formatValue = (v) => String(v),
    parseValue,
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

  const setLo = (v: number) => {
    if (isRange) {
      (props as RangeProps).onChange([clamp(v, min, hi), hi])
    } else {
      (props as SingleProps).onChange(clamp(v, min, max))
    }
  }
  const setHi = (v: number) => {
    if (isRange) {
      (props as RangeProps).onChange([lo, clamp(v, lo, max)])
    }
  }

  const pctLo = pct(lo, min, max)
  const pctHi = pct(hi, min, max)

  const valueFromEvent = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return lo
    const raw = (clientX - rect.left) / rect.width
    return clamp(snap(raw * (max - min) + min, min, step), min, max)
  }

  const startDrag = (thumb: 'lo' | 'hi') => (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = thumb
    const move = (ev: MouseEvent) => {
      const v = valueFromEvent(ev.clientX)
      if (dragging.current === 'lo') setLo(isRange ? Math.min(v, hi) : v)
      else setHi(Math.max(v, lo))
    }
    const up = () => {
      dragging.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging.current) return
    const v = valueFromEvent(e.clientX)
    if (!isRange) { setLo(v); return }
    // Snap to nearest thumb
    const distLo = Math.abs(v - lo), distHi = Math.abs(v - hi)
    if (distLo <= distHi) setLo(Math.min(v, hi))
    else setHi(Math.max(v, lo))
  }

  const thumbStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
    width: 22, height: 22, borderRadius: '50%',
    background: t.accent, border: `3px solid ${t.inputBg}`,
    boxShadow: active
      ? `0 0 0 4px ${t.accent}44, 0 2px 8px ${t.accent}55`
      : `0 2px 6px ${t.accent}55`,
    cursor: 'grab', transition: 'box-shadow 0.2s ease',
    outline: 'none', zIndex: active ? 3 : 2,
  })

  const keyDown = (thumb: 'lo' | 'hi') => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (thumb === 'lo') setLo(isRange ? Math.min(lo + step, hi) : Math.min(lo + step, max))
      else setHi(Math.min(hi + step, max))
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (thumb === 'lo') setLo(Math.max(lo - step, min))
      else setHi(Math.max(hi - step, lo))
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder }}>
          {label}
        </span>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', paddingBottom: 8 }}>
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ position: 'relative', height: 6, borderRadius: 3, background: t.border, cursor: 'pointer' }}
        >
          {/* Fill bar */}
          <div style={{
            position: 'absolute', top: 0, height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${t.accent}88, ${t.accent})`,
            left: isRange ? `${pctLo}%` : '0%',
            right: `${100 - pctHi}%`,
            transition: 'left 0.03s, right 0.03s',
          }} />

          {/* Lo thumb (also the single thumb) */}
          <div
            style={{ ...thumbStyle(focusedThumb === 'lo'), left: `${pctLo}%` }}
            onMouseDown={startDrag('lo')}
            onFocus={() => setFocusedThumb('lo')}
            onBlur={() => setFocusedThumb(null)}
            onKeyDown={keyDown('lo')}
            tabIndex={0}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={isRange ? hi : max}
            aria-valuenow={lo}
          />

          {/* Hi thumb (range only) */}
          {isRange && (
            <div
              style={{ ...thumbStyle(focusedThumb === 'hi'), left: `${pctHi}%` }}
              onMouseDown={startDrag('hi')}
              onFocus={() => setFocusedThumb('hi')}
              onBlur={() => setFocusedThumb(null)}
              onKeyDown={keyDown('hi')}
              tabIndex={0}
              role="slider"
              aria-valuemin={lo}
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
      <div style={{
        display: 'flex', gap: 10, marginTop: 12,
        justifyContent: isRange ? 'space-between' : 'center',
      }}>
        <ManualInput
          value={lo}
          onCommit={v => setLo(isRange ? Math.min(v, hi) : v)}
          format={formatValue}
          parse={parse}
          t={t}
          label={isRange ? 'От' : undefined}
        />
        {isRange && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-end', paddingBottom: 9,
              color: t.placeholder, fontSize: 18, lineHeight: 1, userSelect: 'none',
            }}>—</div>
            <ManualInput
              value={hi}
              onCommit={v => setHi(Math.max(v, lo))}
              format={formatValue}
              parse={parse}
              t={t}
              label="До"
            />
          </>
        )}
      </div>
    </div>
  )
}
