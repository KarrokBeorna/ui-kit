import { useState, useId, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { CalendarIcon, ClockIcon, DateTimeIcon } from '../icons';
import {
  getInputStyle,
  FloatingLabel,
  FieldActions,
  ClearButton,
  IconActionButton,
  FieldError,
} from './_shared/field';

interface DateTimePickerProps {
  label: string;
  theme: Theme;
  value: string;
  onChange: (val: string) => void;
  enableDate?: boolean;
  enableTime?: boolean;
  disabled?: boolean;
  error?: string;
}

export default function DateTimePicker({
  label,
  theme: t,
  value,
  onChange,
  enableDate = true,
  enableTime = true,
  disabled = false,
  error,
}: DateTimePickerProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const cls = 'dtp' + uid.replace(/[^a-z0-9]/gi, '');
  const id = uid + 'input';

  const type =
    enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time';
  const floated = focused || String(value).length > 0;
  const textColor = !focused && !value ? 'transparent' : t.text;

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.focus();
    try {
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.click();
    }
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
    setTimeout(() => {
      inputRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  };

  const PickerIcon =
    type === 'date' ? CalendarIcon : type === 'time' ? ClockIcon : DateTimeIcon;

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .${cls}::-webkit-calendar-picker-indicator {
          opacity: 0;
          pointer-events: none;
          position: absolute;
          width: 0;
          height: 0;
        }
        .${cls}::-webkit-inner-spin-button,
        .${cls}::-webkit-clear-button {
          display: none;
        }
      `}</style>

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onFocus={() => {
            if (!disabled) setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={e => {
            if (!disabled) onChange(e.target.value);
          }}
          className={cls}
          disabled={disabled}
          style={{
            ...getInputStyle(t, {
              error,
              focused,
              disabled,
              padding: value ? '18px 70px 8px 16px' : '18px 46px 8px 16px',
            }),
            color: textColor,
            colorScheme:
              t.bg.startsWith('#0') || t.bg.startsWith('#1') ? 'dark' : 'light',
          }}
          autoComplete="off"
        />

        <FloatingLabel
          htmlFor={id}
          label={label}
          floated={floated}
          error={error}
          t={t}
        />

        <FieldActions>
          {value && (
            <ClearButton onClick={handleClear} t={t} disabled={disabled} size={14} />
          )}
          <IconActionButton
            onClick={openPicker}
            t={t}
            disabled={disabled}
            active={focused}
            ariaLabel="Открыть выбор даты"
          >
            <PickerIcon />
          </IconActionButton>
        </FieldActions>
      </div>

      <FieldError error={error} t={t} />
    </div>
  );
}