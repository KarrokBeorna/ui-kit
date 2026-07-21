import { Theme } from '../themes/theme';

export function inputStyle(t: Theme, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.text,
    fontFamily: 'system-ui',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...extra,
  };
}

export function useFieldFocus(t: Theme) {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = t.accent;
      e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accentGlow}`;
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = t.border;
      e.currentTarget.style.boxShadow = 'none';
    },
  };
}