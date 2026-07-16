import type { Theme } from '../themes/themes'

export interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  label: string
  theme: Theme
  options: RadioOption[]
  value: string
  onChange: (val: string) => void
  direction?: 'horizontal' | 'vertical'
  error?: string
}

export default function RadioGroup({
  label, theme: t, options, value, onChange,
  direction = 'vertical', error,
}: RadioGroupProps) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: direction === 'horizontal' ? 20 : 12,
        flexWrap: direction === 'horizontal' ? 'wrap' : 'nowrap',
      }}>
        {options.map(opt => {
          const selected = value === opt.value
          return (
            <label
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}
            >
              {/* Radio circle */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${selected ? t.accent : t.border}`,
                background: 'transparent',
                transition: 'border-color 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: selected ? `0 0 0 3px ${t.accent}22` : 'none',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: t.accent,
                  transform: selected ? 'scale(1)' : 'scale(0)',
                  transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: t.text, lineHeight: 1.4 }}>{opt.label}</div>
                {opt.description && (
                  <div style={{ fontSize: 12, color: t.placeholder, marginTop: 2 }}>{opt.description}</div>
                )}
              </div>
            </label>
          )
        })}
      </div>
      {error && <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
