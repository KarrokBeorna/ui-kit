import { useState, useRef, useEffect } from 'react';
import {Theme, ThemeName} from '../themes/theme';

interface ThemeSwitcherProps {
  theme: ThemeName;
  onChange: (theme: ThemeName) => void;
  t: Theme;
}

const themeOptions: { id: ThemeName; label: string; dot: string }[] = [
  { id: 'dark', label: 'Dark', dot: '#6c8aff' },
  { id: 'light', label: 'Light', dot: '#4361ee' },
  { id: 'vibrant', label: 'Vibrant', dot: '#c84bff' },
  { id: 'ocean', label: 'Ocean', dot: '#00c8ff' },
];

export function ThemeSwitcher({ theme, onChange, t }: ThemeSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = themeOptions.findIndex(o => o.id === theme);
    const btn = btnRefs.current[idx];
    const wrap = containerRef.current;
    if (btn && wrap) {
      const cr = wrap.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      setPill({ left: br.left - cr.left, width: br.width });
    }
  }, [theme]);

  const activeColor = themeOptions.find(o => o.id === theme)?.dot ?? t.accent;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
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
          width: pill.width - 6,
          borderRadius: 7,
          background: activeColor,
          boxShadow: `0 0 20px ${activeColor}55, 0 2px 8px ${activeColor}44`,
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.4s, box-shadow 0.4s',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {themeOptions.map((opt, idx) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            ref={el => (btnRefs.current[idx] = el)}
            onClick={() => onChange(opt.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
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
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: opt.dot,
                flexShrink: 0,
                boxShadow: active ? `0 0 6px ${opt.dot}` : 'none',
                transition: 'box-shadow 0.3s',
              }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}