import type { Theme } from '../themes/theme';
import { IcoCheck } from './icons';

interface CheckboxProps {
  label: string;
  theme: Theme;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export default function Checkbox({ label, theme: t, checked, onChange, description, disabled }: CheckboxProps) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `1.5px solid ${checked ? t.accent : t.border}`,
          background: checked ? t.accent : 'transparent',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: checked ? `0 0 0 3px ${t.accentGlow}` : 'none',
        }}
      >
        <IcoCheck
          s={11}
          style={{
            opacity: checked ? 1 : 0,
            transform: checked ? 'scale(1)' : 'scale(0.5)',
            transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <div onClick={() => !disabled && onChange(!checked)}>
        <div style={{ fontSize: 14, color: t.text, lineHeight: 1.4 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: t.placeholder, marginTop: 2 }}>{description}</div>}
      </div>
    </label>
  );
}