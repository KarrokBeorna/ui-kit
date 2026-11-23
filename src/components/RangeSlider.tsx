// RangeSlider.tsx — слайдер (одиночный или диапазон) с ручным вводом.
import React, { useState, useRef, useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';

interface SingleProps { range?: false; value: number; onChange: (v: number) => void; }
interface RangeProps { range: true; value: [number | null, number | null]; onChange: (v: [number | null, number | null]) => void; }

export type RangeSliderProps = (SingleProps | RangeProps) & {
  /** Заголовок. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /** Минимум шкалы. @default 0 */
  min?: number;
  /** Максимум шкалы. @default 100 */
  max?: number;
  /** Шаг. @default 1 */
  step?: number;
  /** Форматирование значения для отображения. */
  formatValue?: (v: number | null) => string;
  /** Парсинг ручного ввода (по умолчанию — число с запятой/точкой). */
  parseValue?: (s: string) => number | null;
  /** Блокировка. */
  disabled?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const snap = (v: number, min: number, step: number) => Math.round((v - min) / step) * step + min;
const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

function ManualInput({ value, onCommit, format, parse, t, label, disabled }: {
  value: number | null; onCommit: (v: number | null) => void;
  format: (v: number | null) => string; parse: (s: string) => number | null;
  t: Theme; label?: string; disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const commit = () => {
    if (!editing) return; // защита от двойного commit (Enter + blur)
    setEditing(false);
    const trimmed = raw.trim();
    if (trimmed === '') { onCommit(null); return; }
    const n = parse(trimmed);
    if (n !== null) onCommit(n);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 76 }}>
      {label && (
        <span style={{ fontSize: 10, color: t.placeholder, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text" inputMode="decimal" disabled={disabled}
          value={editing ? raw : format(value)}
          onFocus={() => { if (!disabled) { setEditing(true); setRaw(value !== null ? String(value) : ''); } }}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          style={{
            width: '100%', boxSizing: 'border-box', background: t.bg,
            border: `1.5px solid ${editing ? t.borderFocus : t.border}`, borderRadius: 8,
            padding: '10px 36px 10px 10px', fontSize: 16, fontWeight: 600, color: t.accent,
            outline: 'none', textAlign: 'center', transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: editing ? `0 0 0 3px ${t.borderFocus}22` : 'none',
            fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
            opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'text',
            minHeight: 44, touchAction: 'manipulation',
          }}
        />
        {value !== null && !disabled && (
          <button type="button" aria-label="Очистить"
            onClick={() => { setEditing(false); onCommit(null); }}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.iconColor, borderRadius: 4, transition: 'color 0.15s', padding: 0, touchAction: 'manipulation',
            }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') e.currentTarget.style.color = t.text; }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') e.currentTarget.style.color = t.iconColor; }}
          >
            <IcoX s={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Слайдер значения или диапазона: drag, клик по треку, стрелки клавиатуры, ручной ввод. */
export default function RangeSlider(props: RangeSliderProps) {
  const {
    label, theme: t, min = 0, max = 100, step = 1,
    formatValue = (v) => (v !== null ? String(v) : ''), parseValue, disabled = false,
  } = props;
  const parse = parseValue ?? ((s: string) => {
    const n = parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? null : clamp(snap(n, min, step), min, max);
  });

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'lo' | 'hi' | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const [focusedThumb, setFocusedThumb] = useState<'lo' | 'hi' | null>(null);
  useEffect(() => () => dragCleanup.current?.(), []);

  const isRange = props.range === true;
  const lo = isRange ? (props as RangeProps).value[0] : (props as SingleProps).value;
  const hi = isRange ? (props as RangeProps).value[1] : (props as SingleProps).value;

  const setLo = (v: number | null) => {
    if (disabled) return;
    if (isRange) {
      if (v === null) (props as RangeProps).onChange([null, hi]);
      else (props as RangeProps).onChange([clamp(v, min, hi !== null ? hi : max), hi]);
    } else if (v !== null) {
      (props as SingleProps).onChange(clamp(v, min, max));
    }
  };
  const setHi = (v: number | null) => {
    if (disabled || !isRange) return;
    if (v === null) (props as RangeProps).onChange([lo, null]);
    else (props as RangeProps).onChange([lo, clamp(v, lo !== null ? lo : min, max)]);
  };

  const pctLo = lo !== null ? pct(lo, min, max) : 0;
  const pctHi = hi !== null ? pct(hi, min, max) : 100;

  const valueFromClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return lo !== null ? lo : min;
    return clamp(snap(((clientX - rect.left) / rect.width) * (max - min) + min, min, step), min, max);
  };

  const startDrag = (thumb: 'lo' | 'hi') => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault(); e.stopPropagation();
    dragging.current = thumb;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const v = valueFromClientX(ev.clientX);
      if (dragging.current === 'lo') setLo(v); else setHi(v);
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      dragCleanup.current = null;
    };
    dragCleanup.current = up;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const handleTrackClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || dragging.current) return;
    const v = valueFromClientX(e.clientX);
    if (!isRange) { setLo(v); return; }
    if (lo === null) setLo(v);
    else if (hi === null) setHi(v);
    else if (Math.abs(v - lo) <= Math.abs(v - hi)) setLo(Math.min(v, hi));
    else setHi(Math.max(v, lo));
  };

  const keyDown = (thumb: 'lo' | 'hi') => (e: React.KeyboardEvent) => {
    if (disabled) return;
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0;
    if (!delta) return;
    e.preventDefault();
    if (thumb === 'lo') {
      const cur = lo !== null ? lo : min;
      setLo(clamp(cur + delta, min, isRange && hi !== null ? hi : max));
    } else {
      const cur = hi !== null ? hi : max;
      setHi(clamp(cur + delta, lo !== null ? lo : min, max));
    }
  };

  const visualThumb = (active: boolean): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: '50%', background: t.accent,
    border: `3px solid ${t.bg}`,
    boxShadow: active ? `0 0 0 4px ${t.accent}44, 0 2px 8px ${t.accent}55` : `0 2px 6px ${t.accent}55`,
    cursor: disabled ? 'not-allowed' : 'grab', transition: 'box-shadow 0.2s ease',
    outline: 'none', pointerEvents: 'none',
  });
  const hitWrapper = (leftPct: number): React.CSSProperties => ({
    position: 'absolute', top: '50%', left: `${leftPct}%`, transform: 'translate(-50%, -50%)',
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    touchAction: 'none', outline: 'none',
  });

  return (
    <div style={{ width: '100%', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder }}>
          {label}
        </span>
        {isRange && (
          <button type="button" disabled={disabled}
            onClick={() => { if (!disabled) (props as RangeProps).onChange([null, null]); }}
            style={{
              background: 'none', border: 'none', color: t.placeholder, fontSize: 11,
              cursor: disabled ? 'not-allowed' : 'pointer', textDecoration: 'underline',
              padding: 0, opacity: disabled ? 0.5 : 1, touchAction: 'manipulation',
            }}>
            Очистить
          </button>
        )}
      </div>

      <div style={{ position: 'relative', padding: '16px 0' }}>
        <div ref={trackRef} onPointerDown={handleTrackClick} style={{
          position: 'relative', height: 6, borderRadius: 3, background: t.border,
          cursor: disabled ? 'not-allowed' : 'pointer', touchAction: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${t.accent}88, ${t.accent})`,
            left: lo !== null ? `${pctLo}%` : '0%', right: hi !== null ? `${100 - pctHi}%` : '0%',
            transition: 'left 0.03s, right 0.03s',
          }} />
          {lo !== null && (
            <div style={hitWrapper(pctLo)} onPointerDown={startDrag('lo')}
              onFocus={() => { if (!disabled) setFocusedThumb('lo'); }} onBlur={() => setFocusedThumb(null)}
              onKeyDown={keyDown('lo')} tabIndex={disabled ? -1 : 0} role="slider"
              aria-valuemin={min} aria-valuemax={isRange && hi !== null ? hi : max} aria-valuenow={lo}
              aria-label={isRange ? `${label}: от` : label}>
              <div style={visualThumb(focusedThumb === 'lo')} />
            </div>
          )}
          {isRange && hi !== null && (
            <div style={hitWrapper(pctHi)} onPointerDown={startDrag('hi')}
              onFocus={() => { if (!disabled) setFocusedThumb('hi'); }} onBlur={() => setFocusedThumb(null)}
              onKeyDown={keyDown('hi')} tabIndex={disabled ? -1 : 0} role="slider"
              aria-valuemin={lo !== null ? lo : min} aria-valuemax={max} aria-valuenow={hi}
              aria-label={`${label}: до`}>
              <div style={visualThumb(focusedThumb === 'hi')} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: t.placeholder }}>{formatValue(min)}</span>
          <span style={{ fontSize: 11, color: t.placeholder }}>{formatValue(max)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: isRange ? 'space-between' : 'center' }}>
        <ManualInput
          value={lo}
          onCommit={(v) => setLo(isRange && v !== null ? Math.min(v, hi !== null ? hi : max) : v)}
          format={formatValue} parse={parse} t={t} label={isRange ? 'От' : undefined} disabled={disabled}
        />
        {isRange && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9, color: t.placeholder, fontSize: 18, lineHeight: 1, userSelect: 'none' }}>—</div>
            <ManualInput
              value={hi}
              onCommit={(v) => setHi(v !== null ? Math.max(v, lo !== null ? lo : min) : null)}
              format={formatValue} parse={parse} t={t} label="До" disabled={disabled}
            />
          </>
        )}
      </div>
    </div>
  );
}