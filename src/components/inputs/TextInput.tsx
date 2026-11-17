import { forwardRef, useState, useId, useRef, type ForwardedRef } from 'react';
import type { Theme } from '../../themes/theme';
import {
  getInputStyle,
  FloatingLabel,
  FieldActions,
  ClearButton,
  FieldError,
} from './_shared/field';

export type TextInputType = 'text' | 'email' | 'tel';

function sanitizeTel(raw: string) {
  return raw.replace(/[^\d+\-()\s]/g, '');
}

function validateOnBlur(value: string, type: TextInputType): string {
  if (!value) return '';
  if (type === 'email' && !value.includes('@')) return 'Обязателен символ @';
  if (type === 'tel') {
    if (!/[+\-]/.test(value)) return 'Обязателен символ + или −';
    if (!/\d/.test(value)) return 'Введите номер телефона';
  }
  return '';
}

interface TextInputProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  inputType?: TextInputType;
  onTypeChange?: (t: TextInputType) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      theme: t,
      value,
      onChange,
      inputType = 'text',
      error: externalError,
      autoFocus = false,
      disabled = false,
    },
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);
    const id = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const floated = focused || String(value).length > 0;

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
    };

    const internalError = touched ? validateOnBlur(value, inputType) : '';
    const error = externalError || internalError;

    const handleChange = (raw: string) => {
      if (disabled) return;
      onChange(inputType === 'tel' ? sanitizeTel(raw) : raw);
    };

    const handleClear = () => {
      if (disabled) return;
      onChange('');
      setTouched(false);
      setTimeout(() => {
        inputRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
      }, 0);
    };

    return (
      <div style={{ width: '100%' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={setRefs}
            id={id}
            type={inputType === 'tel' ? 'text' : inputType}
            inputMode={inputType === 'tel' ? 'tel' : undefined}
            value={value}
            onFocus={() => {
              if (!disabled) setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
            }}
            onChange={e => handleChange(e.target.value)}
            placeholder=""
            autoFocus={autoFocus}
            disabled={disabled}
            style={getInputStyle(t, {
              error,
              focused,
              disabled,
              padding: '18px 40px 8px 16px',
            })}
            autoComplete="off"
          />
          <FloatingLabel
            htmlFor={id}
            label={label}
            floated={floated}
            error={error}
            t={t}
          />
          {value && (
            <FieldActions>
              <ClearButton
                onClick={handleClear}
                t={t}
                disabled={disabled}
                size={14}
              />
            </FieldActions>
          )}
        </div>
        <FieldError error={error} t={t} />
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;