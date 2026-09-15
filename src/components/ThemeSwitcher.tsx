import { useState, useRef, useEffect } from 'react';
import { Theme, ThemeName } from '../themes/theme';

interface ThemeSwitcherProps {
  theme: ThemeName;
  onChange: (theme: ThemeName) => void;
  t: Theme;
  compact?: boolean;
  /**
   * Растянуть переключатель на всю ширину родителя.
   * Кнопки становятся равной ширины (flex: 1).
   * @default false
   */
  stretch?: boolean;
  /**
   * Высота кнопок, px. Удобно увеличивать для тач-интерфейсов.
   * @default undefined (авто)
   */
  minButtonHeight?: number;
}

const themeOptions: { id: ThemeName; label: string; dot: string }[] = [
  { id: 'dark', label: 'Dark', dot: '#6c8aff' },
  { id: 'light', label: 'Light', dot: '#4361ee' },
  { id: 'vibrant', label: 'Vibrant', dot: '#c84bff' },
  { id: 'ocean', label: 'Ocean', dot: '#00c8ff' },
];

export function ThemeSwitcher({
  theme,
  onChange,
  t,
  compact = false,
  stretch = false,
  minButtonHeight,
}: ThemeSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = themeOptions.findIndex((o) => o.id === theme);
    const btn = btnRefs.current[idx];
    const wrap = containerRef.current;
    if (!btn || !wrap) return;

    const update = () => {
      const cr = wrap.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      setPill({ left: br.left - cr.left, width: br.width });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [theme, compact, stretch, minButtonHeight]);

  const activeColor = themeOptions.find((o) => o.id === theme)?.dot ?? t.accent;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',                       // было inline-flex; для stretch нужен flex
        width: stretch ? '100%' : 'auto',
        boxSizing: 'border-box',
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        background: t.bgSurface,
        padding: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: pill.left + 3,
          width: Math.max(pill.width - 6, 0),
          borderRadius: 7,
          background: activeColor,
          boxShadow: `0 0 20px ${activeColor}55, 0 2px 8px ${activeColor}44`,
          transition:
            'left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.4s, box-shadow 0.4s',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {themeOptions.map((opt, idx) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            onClick={() => onChange(opt.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: stretch ? 1 : undefined,
              gap: compact ? 0 : 6,
              padding: compact
                ? stretch
                  ? '10px 0'
                  : '6px 8px'
                : '6px 16px',
              minHeight: minButtonHeight,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'system-ui',
              fontWeight: active ? 600 : 400,
              color: active ? '#fff' : t.textMuted,
              transition: 'color 0.25s',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                width: compact ? (stretch ? 12 : 8) : 7,
                height: compact ? (stretch ? 12 : 8) : 7,
                borderRadius: '50%',
                background: opt.dot,
                flexShrink: 0,
                boxShadow: active ? `0 0 8px ${opt.dot}` : 'none',
                transition: 'box-shadow 0.3s, transform 0.3s, width 0.2s, height 0.2s',
                transform: active && compact ? 'scale(1.15)' : 'scale(1)',
              }}
            />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}