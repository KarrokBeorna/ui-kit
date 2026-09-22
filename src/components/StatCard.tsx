import type { Theme } from '../themes/theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  theme: Theme;
}

export default function StatCard({ label, value, hint, theme: t }: StatCardProps) {
  return (
    <div
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: 'system-ui' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: t.text,
          fontFamily: 'system-ui',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'system-ui' }}>
          {hint}
        </div>
      )}
    </div>
  );
}