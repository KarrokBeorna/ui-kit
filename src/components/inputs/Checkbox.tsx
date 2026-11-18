import { useId, useState, type CSSProperties } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoCheck } from '../icons';

interface CheckboxProps {
  label: string;
  theme: Theme;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
  /**
   * 'md' — стандартная строка с тач-таргетом 44px.
   * 'sm' — плотная строка 25.6px для списков и модалок настроек.
   * @default 'md'
   */
  size?: 'sm' | 'md';
  /** Обрезать длинный label многоточием в одну строку. */
  truncate?: boolean;
  /** Стиль корневого label (например, flex: 1 в строке настроек). */
  style?: CSSProperties;
}

export default function Checkbox({
  label,
  theme: t,
  checked,
  onChange,
  description,
  disabled,
  size = 'md',
  truncate = false,
  style,
}: CheckboxProps) {
  const [focused, setFocused] = useState(false);
  const descId = useId();
  const dense = size === 'sm';
  const box = dense ? 16 : 20;

  return (
    <label
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: dense ? 'center' : 'flex-start',
        gap: dense ? 8 : 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        minHeight: dense ? 25.6 : 44,
        padding: dense ? 0 : '8px 0',
        touchAction: 'manipulation',
        ...style,
      }}
    >
      {/* Настоящий input — клавиатура, скринридер, фокус из коробки.
          Скрыт clip-паттерном: не display:none, остаётся фокусируемым. */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (!disabled) onChange(e.target.checked);
        }}
        onFocus={(e) => {
          let keyboard = true;
          try {
            keyboard = e.currentTarget.matches(':focus-visible');
          } catch {
            /* старые браузеры — показываем кольцо всегда */
          }
          setFocused(keyboard);
        }}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        aria-describedby={description ? descId : undefined}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          border: 0,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <span
        aria-hidden
        style={{
          width: box,
          height: box,
          borderRadius: dense ? 5 : 6,
          flexShrink: 0,
          marginTop: dense ? 0 : 1,
          border: `1.5px solid ${checked ? t.accent : t.border}`,
          background: checked ? t.accent : 'transparent',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: focused
            ? `0 0 0 3px ${t.accentGlow}, 0 0 0 1.5px ${t.accent}`
            : checked
              ? `0 0 0 3px ${t.accentGlow}`
              : 'none',
        }}
      >
        <IcoCheck
          s={dense ? 9 : 11}
          style={{
            opacity: checked ? 1 : 0,
            transform: checked ? 'scale(1)' : 'scale(0.5)',
            transition:
              'opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </span>

      <span style={{ minWidth: 0, flex: truncate ? 1 : undefined }}>
        <span
          title={truncate ? label : undefined}
          style={{
            display: 'block',
            fontSize: 14,
            color: t.text,
            lineHeight: 1.4,
            ...(truncate
              ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
              : null),
          }}
        >
          {label}
        </span>
        {description && (
          <span
            id={descId}
            style={{
              display: 'block',
              fontSize: 12,
              color: t.placeholder,
              marginTop: 2,
            }}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
}