import { memo, type CSSProperties } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoHorHeader, IcoVerHeader } from '../icons';
import { useResponsive } from '../../context/ResponsiveContext';
import { useStyleTag } from './ThemeSwitcher';

export type LayoutMode = 'horizontal' | 'vertical';

export interface LayoutToggleProps {
  mode: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  theme: Theme;
  minButtonHeight?: number;
}

const CSS = `
.kbs-layout-btn { background: transparent; color: var(--lt-muted); transition: background .2s ease, color .2s ease; }
.kbs-layout-btn[aria-pressed="true"] { background: var(--lt-accent); color: var(--lt-on); }
@media (hover: hover) {
  .kbs-layout-btn:not([aria-pressed="true"]):hover { background: var(--lt-hover); color: var(--lt-text); }
  .kbs-icon-btn:hover { background: var(--lt-hover); color: var(--lt-text); }
}
.kbs-layout-btn:focus-visible, .kbs-icon-btn:focus-visible {
  outline: 2px solid var(--lt-accent); outline-offset: 2px;
}
.kbs-icon-btn { background: transparent; color: var(--lt-muted); transition: background .15s, color .15s; }
@media (prefers-reduced-motion: reduce) {
  .kbs-layout-btn, .kbs-icon-btn { transition: none !important; }
}
`;

const MODES: { id: LayoutMode; label: string }[] = [
  { id: 'horizontal', label: 'Горизонтальное меню' },
  { id: 'vertical', label: 'Вертикальное меню' },
];

const vars = (t: Theme): CSSProperties => ({
  '--lt-accent': t.accent, '--lt-on': t.accentText,
  '--lt-muted': t.textMuted, '--lt-text': t.text, '--lt-hover': t.navHoverBg,
} as CSSProperties);

export const LayoutToggle = memo(function LayoutToggle({
  mode, onChange, theme: t, minButtonHeight,
}: LayoutToggleProps) {
  useStyleTag('kbs-layout-toggle-css', CSS);
  const { isTouch } = useResponsive();

  return (
    <div
      role="group"
      aria-label="Расположение меню"
      style={{
        display: 'flex', gap: 3, padding: 4, background: t.bgSurface,
        borderRadius: 9, border: `1px solid ${t.border}`, ...vars(t),
      }}
    >
      {MODES.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            className="kbs-layout-btn"
            onClick={() => onChange(m.id)}
            aria-label={m.label}
            title={m.label}
            aria-pressed={isActive}
            style={{
              padding: '5px 10px', minHeight: minButtonHeight ?? (isTouch ? 40 : undefined),
              borderRadius: 6, border: 'none', fontSize: 11,
              fontFamily: 'system-ui, sans-serif', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              touchAction: 'manipulation',
            }}
          >
            {m.id === 'horizontal' ? <IcoHorHeader s={14} /> : <IcoVerHeader s={14} />}
          </button>
        );
      })}
    </div>
  );
});

/** Одна иконка-кнопка ~24×24 (на таче хит-зона 44×44). */
export const CompactLayoutToggle = memo(function CompactLayoutToggle({
  mode, onChange, theme: t, size = 24,
}: LayoutToggleProps & { size?: number }) {
  useStyleTag('kbs-layout-toggle-css', CSS);
  const { isTouch } = useResponsive();

  const Icon = mode === 'horizontal' ? IcoHorHeader : IcoVerHeader;
  const next: LayoutMode = mode === 'horizontal' ? 'vertical' : 'horizontal';
  const nextLabel = next === 'vertical' ? 'вертикальное' : 'горизонтальное';
  const hit = isTouch ? Math.max(size, 44) : size;

  return (
    <button
      type="button"
      className="kbs-icon-btn"
      onClick={() => onChange(next)}
      title={`Включить ${nextLabel} меню`}
      aria-label={`Переключить на ${nextLabel} меню`}
      style={{
        width: hit, height: hit, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        touchAction: 'manipulation', ...vars(t),
      }}
    >
      <Icon s={Math.round(size * 0.65)} />
    </button>
  );
});