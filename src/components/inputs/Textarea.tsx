import { useState, useId, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoX } from '../icons';
import {
  getInputStyle,
  FloatingLabel,
  IconActionButton,
  FieldError,
} from './_shared/field';

interface TextareaProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

export default function Textarea({
  label,
  theme: t,
  value,
  onChange,
  rows = 4,
  maxLength,
  error,
  disabled = false,
}: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const floated = focused || String(value).length > 0;

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setTimeout(() => {
      textareaRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onFocus={() => {
            if (!disabled) setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={e => {
            if (!disabled) onChange(e.target.value);
          }}
          rows={rows}
          maxLength={maxLength}
          placeholder=""
          disabled={disabled}
          style={{
            ...getInputStyle(t, {
              error,
              focused,
              disabled,
              padding: '22px 40px 10px 16px',
            }),
            height: 'auto',
            minHeight: 80,
            resize: 'vertical',
            lineHeight: 1.6,
          }}
          autoComplete="off"
        />
        <FloatingLabel
          htmlFor={id}
          label={label}
          floated={floated}
          error={error}
          t={t}
          textarea
        />
        {value && (
          <div style={{ position: 'absolute', right: 8, top: 8 }}>
            <IconActionButton
              onClick={handleClear}
              t={t}
              disabled={disabled}
              ariaLabel="Очистить"
            >
              <IcoX s={13} />
            </IconActionButton>
          </div>
        )}
      </div>

      {maxLength && (
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}
        >
          <span
            style={{
              fontSize: 11,
              color: value.length >= maxLength ? t.danger : t.placeholder,
            }}
          >
            {value.length} / {maxLength}
          </span>
        </div>
      )}

      <FieldError error={error} t={t} />
    </div>
  );
}