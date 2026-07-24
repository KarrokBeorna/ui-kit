import { useState, useId, useRef, useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';

interface TextareaProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export default function Textarea({
  label, theme: t, value, onChange, rows = 4, maxLength, error,
}: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const newVal = textarea.value;
      if (newVal !== valueRef.current) {
        onChange(newVal);
      }
    };

    if (textarea.value !== valueRef.current) {
      onChange(textarea.value);
    }

    textarea.addEventListener('input', handleInput);
    return () => textarea.removeEventListener('input', handleInput);
  }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const input = textareaRef.current;
      if (input && input.value !== valueRef.current) {
        onChange(input.value);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [onChange]);

  const floated = focused || value.length > 0;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : focused ? t.borderFocus : t.border}`,
            borderRadius: 10,
            padding: '22px 40px 10px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit', lineHeight: 1.6,
            minHeight: 80,
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: 'absolute', left: 14,
            top: floated ? 0 : 20,
            transform: floated ? 'translateY(-50%) scale(0.78)' : 'translateY(0)',
            transformOrigin: 'left center',
            color: error ? t.danger : floated ? t.labelFloat : t.placeholder,
            fontSize: 15, pointerEvents: 'none',
            transition: 'top 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1), color 0.22s ease',
            background: floated ? t.labelBg : 'transparent',
            padding: floated ? '0 4px' : '0',
            borderRadius: 3, lineHeight: 1, whiteSpace: 'nowrap', zIndex: 1,
          }}
        >
          {label}
        </label>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              position: 'absolute', right: 10, top: 12,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.iconColor, padding: 4, display: 'flex', alignItems: 'center',
              transition: 'color 0.15s', borderRadius: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
          >
            <IcoX s={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        {maxLength && (
          <span style={{ fontSize: 11, color: value.length >= maxLength ? t.danger : t.placeholder }}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {error && <p style={{ margin: '2px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}