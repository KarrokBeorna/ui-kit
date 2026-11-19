// CustomInput.tsx — единое текстовое поле. Объединяет TextInput, NumberInput,
// PasswordInput, DateTimePicker и Textarea через проп type.

import React, { forwardRef, useId, useRef, useState, type ForwardedRef } from 'react';
import { colorScheme, type Theme } from '../themes/theme';
import { useStyleTag } from '../hooks';
import { IcoEye, IcoArrowUp, IcoArrowDown, IcoX, CalendarIcon, ClockIcon, DateTimeIcon } from './icons';
import { getInputStyle, FloatingLabel, FieldActions, ClearButton, IconActionButton, FieldError } from './field';

/** Тип поля: текст / email / телефон / пароль / число / дата / время / дата+время / многострочный текст. */
export type CustomInputType =
  | 'text' | 'email' | 'tel' | 'password' | 'number'
  | 'date' | 'time' | 'datetime' | 'textarea';

export interface CustomInputProps {
  /** Тип поля. @default 'text' */
  type?: CustomInputType;
  /** Плавающая метка. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /** Текущее значение (controlled). date: 'YYYY-MM-DD', time: 'HH:mm', datetime: 'YYYY-MM-DDTHH:mm'. */
  value: string;
  /** Колбэк изменения значения. */
  onChange: (value: string) => void;
  /** Внешняя ошибка. Для email/tel добавляется внутренняя валидация после blur. */
  error?: string;
  /** Блокировка поля. */
  disabled?: boolean;
  /** Автофокус при монтировании. */
  autoFocus?: boolean;
  /** password: индикатор надёжности пароля. */
  showStrength?: boolean;
  /** password: атрибут autoComplete. @default 'new-password' */
  autoComplete?: string;
  /** number: разрешить дробные значения. @default true */
  allowDecimal?: boolean;
  /** number: минимум для степперов и клампа. */
  min?: number;
  /** number: максимум для степперов и клампа. */
  max?: number;
  /** number: шаг степперов. @default 0.1 (дробные) или 1 */
  step?: number;
  /** textarea: количество строк. @default 4 */
  rows?: number;
  /** textarea: лимит символов (нативный + счётчик). */
  maxLength?: number;
}

const DTP_CSS = `
.kbs-dtp::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; position: absolute; width: 0; height: 0; }
.kbs-dtp::-webkit-inner-spin-button, .kbs-dtp::-webkit-clear-button { display: none; }
`;

const sanitizeTel = (raw: string) => raw.replace(/[^\d+\-()\s]/g, '');

function validateOnBlur(value: string, type: CustomInputType): string {
  if (!value) return '';
  if (type === 'email' && !value.includes('@')) return 'Обязателен символ @';
  if (type === 'tel') {
    if (!/[+\-]/.test(value)) return 'Обязателен символ + или −';
    if (!/\d/.test(value)) return 'Введите номер телефона';
  }
  return '';
}

function StrengthBar({ value, t }: { value: string; t: Theme }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  const levels = [
    { label: 'Слабый', color: t.danger }, { label: 'Слабый', color: t.danger },
    { label: 'Средний', color: '#f59e0b' }, { label: 'Хороший', color: '#22c55e' },
    { label: 'Сильный', color: '#10b981' },
  ];
  const { label, color } = levels[score];
  return (
    <div style={{ marginTop: 8, paddingLeft: 2 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? color : t.border, transition: 'background 0.3s ease' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

/**
 * Универсальное поле ввода с плавающей меткой, очисткой и валидацией.
 * Заменяет TextInput / NumberInput / PasswordInput / DateTimePicker / Textarea.
 */
const CustomInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, CustomInputProps>(
  function CustomInput({
    type = 'text', label, theme: t, value, onChange,
    error: externalError, disabled = false, autoFocus = false,
    showStrength = false, autoComplete,
    allowDecimal = true, min, max, step,
    rows = 4, maxLength,
  }, ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>) {
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);
    const [visible, setVisible] = useState(false);
    const id = useId();
    const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    useStyleTag('kbs-dtp-css', DTP_CSS);

    const isTextarea = type === 'textarea';
    const isPassword = type === 'password';
    const isNumber = type === 'number';
    const isDateLike = type === 'date' || type === 'time' || type === 'datetime';
    const floated = focused || String(value).length > 0;
    const error = externalError || (touched ? validateOnBlur(value, type) : '');

    const setRefs = (node: HTMLInputElement | HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | HTMLTextAreaElement | null }).current = node;
    };

    const handleChange = (raw: string) => {
      if (disabled) return;
      if (type === 'tel') { onChange(sanitizeTel(raw)); return; }
      if (isNumber) {
        if (raw === '' || raw === '-') { onChange(raw); return; }
        const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
        if (pattern.test(raw)) onChange(raw);
        return;
      }
      onChange(raw);
    };

    const handleClear = () => { if (!disabled) { onChange(''); setTouched(false); } };

    const stepBy = (dir: 1 | -1) => {
      if (disabled) return;
      const cur = parseFloat(value) || 0;
      const inc = step ?? (allowDecimal ? 0.1 : 1);
      let next = Math.round((cur + dir * inc) * 1e10) / 1e10;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      onChange(String(next));
    };

    const openPicker = () => {
      if (disabled) return;
      const el = innerRef.current as HTMLInputElement | null;
      el?.focus();
      try { el?.showPicker?.(); } catch { el?.click(); }
    };

    const padRight = isTextarea ? 40 : isNumber ? 80 : isPassword ? (value ? 76 : 46) : isDateLike ? (value ? 70 : 46) : 40;
    const nativeType =
      type === 'datetime' ? 'datetime-local'
      : isDateLike ? type
      : isPassword ? (visible ? 'text' : 'password')
      : type === 'tel' || isNumber ? 'text'
      : type;
    const inputMode = type === 'tel' ? 'tel' : isNumber ? (allowDecimal ? 'decimal' : 'numeric') : undefined;
    const PickerIcon = type === 'date' ? CalendarIcon : type === 'time' ? ClockIcon : DateTimeIcon;

    const sharedProps = {
      id, value, disabled, autoFocus, placeholder: '',
      onFocus: () => { if (!disabled) setFocused(true); },
      onBlur: () => { setFocused(false); setTouched(true); },
      autoComplete: isPassword ? (autoComplete ?? 'new-password') : 'off',
    };

    const fieldStyle: React.CSSProperties = {
      ...getInputStyle(t, {
        error, focused, disabled,
        padding: isTextarea ? '22px 40px 10px 16px' : `18px ${padRight}px 8px 16px`,
      }),
      ...(isTextarea ? { height: 'auto', minHeight: 80, resize: 'vertical' as const, lineHeight: 1.6 } : null),
      ...(isPassword ? { letterSpacing: visible ? 'normal' : value ? '2px' : 'normal' } : null),
      ...(isDateLike ? {
        color: !focused && !value ? 'transparent' : t.text,
        colorScheme: colorScheme(t.bg),
      } : null),
    };

    const stepperStyle: React.CSSProperties = {
      width: 22, height: 16, background: 'transparent', border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4, padding: 0, color: t.iconColor, transition: 'color 0.15s',
      opacity: disabled ? 0.5 : 1, touchAction: 'manipulation',
    };
    const keepFocus = (e: React.PointerEvent) => e.preventDefault();
    const hoverAccent = (e: React.PointerEvent<HTMLButtonElement>) => { if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.accent; };
    const hoverReset = (e: React.PointerEvent<HTMLButtonElement>) => { if (e.pointerType === 'mouse' && !disabled) e.currentTarget.style.color = t.iconColor; };

    return (
      <div style={{ width: '100%' }}>
        <div style={{ position: 'relative' }}>
          {isTextarea ? (
            <textarea
              {...sharedProps} ref={setRefs as React.Ref<HTMLTextAreaElement>}
              rows={rows} maxLength={maxLength}
              onChange={(e) => handleChange(e.target.value)}
              style={fieldStyle}
            />
          ) : (
            <input
              {...sharedProps} ref={setRefs as React.Ref<HTMLInputElement>}
              type={nativeType} inputMode={inputMode}
              className={isDateLike ? 'kbs-dtp' : undefined}
              onChange={(e) => handleChange(e.target.value)}
              style={fieldStyle}
            />
          )}
          <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} textarea={isTextarea} />

          {isTextarea ? (
            value && (
              <div style={{ position: 'absolute', right: 8, top: 8 }}>
                <IconActionButton onClick={handleClear} t={t} disabled={disabled} ariaLabel="Очистить">
                  <IcoX s={13} />
                </IconActionButton>
              </div>
            )
          ) : (
            <FieldActions>
              {value && !isDateLike && <ClearButton onClick={handleClear} t={t} disabled={disabled} size={isPassword || isNumber ? 12 : 14} />}
              {value && isDateLike && <ClearButton onClick={handleClear} t={t} disabled={disabled} size={14} />}
              {isPassword && (
                <IconActionButton
                  onClick={() => { if (!disabled) setVisible((v) => !v); }}
                  t={t} disabled={disabled} active={visible} activeColor={t.accent}
                  ariaLabel={visible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <IcoEye s={18} off={!visible} />
                </IconActionButton>
              )}
              {isNumber && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: value ? 2 : 0 }}>
                  <button type="button" onPointerDown={keepFocus} onClick={() => stepBy(1)} disabled={disabled}
                    aria-label="Увеличить" style={stepperStyle} onPointerEnter={hoverAccent} onPointerLeave={hoverReset}>
                    <IcoArrowUp s={12} />
                  </button>
                  <button type="button" onPointerDown={keepFocus} onClick={() => stepBy(-1)} disabled={disabled}
                    aria-label="Уменьшить" style={stepperStyle} onPointerEnter={hoverAccent} onPointerLeave={hoverReset}>
                    <IcoArrowDown s={12} />
                  </button>
                </div>
              )}
              {isDateLike && (
                <IconActionButton onClick={openPicker} t={t} disabled={disabled} active={focused} ariaLabel="Открыть выбор даты">
                  <PickerIcon />
                </IconActionButton>
              )}
            </FieldActions>
          )}
        </div>

        {isTextarea && maxLength != null && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: value.length >= maxLength ? t.danger : t.placeholder }}>
              {value.length} / {maxLength}
            </span>
          </div>
        )}
        {isPassword && showStrength && <StrengthBar value={value} t={t} />}
        <FieldError error={error} t={t} />
      </div>
    );
  },
);

export default CustomInput;