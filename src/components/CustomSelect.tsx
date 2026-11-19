// CustomSelect.tsx — единый селект с поиском (single / multiple).
//
// ИЗМЕНЕНИЯ:
//  • usePortal={false} теперь реально отличается: дропдаун позиционируется
//    absolute внутри поля (участвует в локальном стекинге и обрезается
//    overflow:hidden родителя). usePortal={true} — fixed в document.body.
//  • Крестик «Очистить» больше не мигает дропдауном (field.IconActionButton
//    гасит pointerdown; здесь stopPropagation включён).
//  • Позиция fixed-дропдауна следит за сдвигом поля (watchLayout), а не только
//    за его собственным ресайзом.

import React, { useState, useId, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import { watchLayout } from '../hooks';
import { IcoChevronDown, IcoCheck } from './icons';
import { getInputStyle, FloatingLabel, FieldActions, ClearButton, IconActionButton, FieldError } from './field';

/** Опция селекта. */
export interface SelectOption { value: string; label: string; }

interface BaseProps {
  /** Плавающая метка. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /** Список опций. */
  options: SelectOption[];
  /** Текст ошибки под полем. */
  error?: string;
  /** true — дропдаун в portal (fixed, не обрезается overflow). false — absolute внутри поля. @default true */
  usePortal?: boolean;
  /** Блокировка поля. */
  disabled?: boolean;
}
interface SingleProps extends BaseProps {
  /** Одиночный выбор. @default 'single' */
  type?: 'single';
  /** Значение выбранной опции ('' — ничего). */
  value: string;
  /** Колбэк выбора. */
  onChange: (value: string) => void;
}
interface MultipleProps extends BaseProps {
  /** Множественный выбор. */
  type: 'multiple';
  /** Массив выбранных значений. */
  value: string[];
  /** Колбэк изменения набора. */
  onChange: (values: string[]) => void;
}
export type CustomSelectProps = SingleProps | MultipleProps;

/** Русская плюрализация с учётом 11–14. */
function pluralValues(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} значение`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} значения`;
  return `${n} значений`;
}

/** Fixed-позиционирование дропдауна у инпута с учётом visualViewport и сдвига поля. */
function useDropdownPosition(
  open: boolean,
  inputRef: RefObject<HTMLElement | null>,
  dropdownRef: RefObject<HTMLElement | null>,
): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed', top: 0, left: 0, width: 0, zIndex: 9999, visibility: 'hidden',
  });
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!open || !input) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight, vw = vv?.width ?? window.innerWidth;
      const vTop = vv?.offsetTop ?? 0, vLeft = vv?.offsetLeft ?? 0;
      const dh = dropdownRef.current?.offsetHeight || 240;
      const spaceBelow = vTop + vh - rect.bottom - 12;
      const spaceAbove = rect.top - vTop - 12;
      const above = spaceBelow < Math.min(dh, 200) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, above ? spaceAbove : spaceBelow);
      const top = above ? Math.max(vTop + 8, rect.top - 4 - Math.min(dh, maxHeight)) : rect.bottom + 4;
      const left = Math.max(vLeft + 8, Math.min(rect.left, vLeft + vw - rect.width - 8));
      setStyle({
        position: 'fixed', top, left, width: Math.min(rect.width, vw - 16),
        maxHeight, overflowY: 'auto', zIndex: 9999, visibility: 'visible',
        borderRadius: above ? '10px 10px 0 0' : '0 0 10px 10px',
      });
    };
    update();
    const raf = requestAnimationFrame(update);
    const stop = watchLayout(input, update);
    return () => { cancelAnimationFrame(raf); stop(); };
  }, [open, inputRef, dropdownRef]);
  return style;
}

/**
 * Селект с поиском, клавиатурной навигацией (↑/↓/Enter/Esc/Home/End),
 * одиночным и множественным выбором. Заменяет SearchableSelect / MultiSelect.
 */
export default function CustomSelect(props: CustomSelectProps) {
  const { label, theme: t, options, error, usePortal = true, disabled = false } = props;
  const multiple = props.type === 'multiple';
  const selected: string[] = multiple
    ? (props as MultipleProps).value
    : (props as SingleProps).value ? [(props as SingleProps).value] : [];
  const emit = (vals: string[]) => {
    if (multiple) (props as MultipleProps).onChange(vals);
    else (props as SingleProps).onChange(vals[0] ?? '');
  };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const id = useId();
  const listId = `${id}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fixedStyle = useDropdownPosition(open && usePortal, inputRef, dropdownRef);

  const floated = focused || open || selected.length > 0;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.value));
  const someFilteredSelected = filtered.some((o) => selected.includes(o.value));

  const close = () => { setOpen(false); setQuery(''); setFocused(false); };
  const openDropdown = () => {
    if (disabled || open) return;
    setOpen(true); setFocused(true); setHighlight(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const toggleDropdown = () => { if (open) { close(); inputRef.current?.blur(); } else openDropdown(); };

  const choose = (opt: SelectOption) => {
    if (disabled) return;
    if (multiple) {
      emit(selected.includes(opt.value) ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
    } else {
      emit([opt.value]);
      close();
    }
  };
  const toggleAll = () => {
    if (disabled) return;
    if (allFilteredSelected) emit(selected.filter((v) => !filtered.some((o) => o.value === v)));
    else emit([...selected, ...filtered.filter((o) => !selected.includes(o.value)).map((o) => o.value)]);
  };
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.stopPropagation();
    emit([]);
    setOpen(false); setQuery(''); setFocused(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => { setHighlight(0); }, [query, open]);
  useEffect(() => {
    if (!open) return;
    dropdownRef.current?.querySelector(`[data-idx="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { openDropdown(); return; }
      const n = filtered.length;
      if (!n) return;
      setHighlight((h) => e.key === 'ArrowDown' ? (h + 1) % n : (h - 1 + n) % n);
      return;
    }
    if (e.key === 'Home' && open) { e.preventDefault(); setHighlight(0); return; }
    if (e.key === 'End' && open) { e.preventDefault(); setHighlight(filtered.length - 1); return; }
    if (e.key === 'Enter' && open && filtered[highlight]) { e.preventDefault(); choose(filtered[highlight]); }
  };

  const displayValue = (() => {
    if (selected.length === 0) return '';
    if (selected.length === 1) return options.find((o) => o.value === selected[0])?.label ?? '';
    return pluralValues(selected.length);
  })();

  const checkBox = (on: boolean, indeterminate = false) => (
    <div style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      border: `1.5px solid ${on || indeterminate ? t.accent : t.border}`,
      background: on ? t.accent : 'transparent', transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on ? <IcoCheck s={10} style={{ stroke: '#fff' }} />
        : indeterminate ? <div style={{ width: 8, height: 2, background: t.accent, borderRadius: 1 }} /> : null}
    </div>
  );

  /** Inline-режим: обычный absolute внутри поля — обрезается overflow родителя. */
  const inlineStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%',
    maxHeight: 240, overflowY: 'auto', zIndex: 20, visibility: 'visible',
    borderRadius: '0 0 10px 10px', boxSizing: 'border-box',
  };

  const dropdownContent = open && !disabled && (
    <div
      ref={dropdownRef} data-dropdown="true" role="listbox" id={listId}
      aria-multiselectable={multiple || undefined} aria-label={label}
      style={{
        ...(usePortal ? fixedStyle : inlineStyle),
        background: t.dropdownBg, border: `1.5px solid ${t.borderFocus}`,
        boxShadow: t.shadowLg, boxSizing: 'border-box',
        animation: 'dropDown 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {multiple && (
        <div
          role="option" aria-selected={allFilteredSelected} tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onClick={toggleAll}
          style={{
            padding: '10px 16px', borderBottom: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            transition: 'background 0.15s', minHeight: 44,
          }}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') e.currentTarget.style.background = t.dropdownHover; }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') e.currentTarget.style.background = 'transparent'; }}
        >
          {checkBox(allFilteredSelected, someFilteredSelected && !allFilteredSelected)}
          <span style={{ fontSize: 13, fontWeight: 600, color: t.accent }}>
            Выбрать все {query ? `(${filtered.length})` : ''}
          </span>
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ padding: '12px 16px', color: t.placeholder, fontSize: 14 }}>Ничего не найдено</div>
      ) : (
        filtered.map((opt, idx) => {
          const sel = selected.includes(opt.value);
          const hl = idx === highlight;
          return (
            <div
              key={opt.value} data-idx={idx} id={`${listId}-${idx}`}
              role="option" aria-selected={sel} tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(opt)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHighlight(idx); }}
              style={{
                padding: '12px 16px', fontSize: 14, cursor: 'pointer',
                color: sel ? t.dropdownSelectedText : t.text,
                background: sel ? t.dropdownSelected : hl ? t.dropdownHover : 'transparent',
                transition: 'background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, touchAction: 'manipulation',
              }}
            >
              {checkBox(sel)}
              {opt.label}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{ position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer' }}
        onPointerDown={(e) => { e.preventDefault(); if (!disabled) openDropdown(); }}
      >
        <input
          ref={inputRef} id={id}
          role="combobox" aria-expanded={open} aria-controls={listId}
          aria-activedescendant={open && filtered[highlight] ? `${listId}-${highlight}` : undefined}
          aria-autocomplete="list" aria-haspopup="listbox"
          value={open ? query : displayValue}
          onChange={(e) => { if (!disabled) setQuery(e.target.value); }}
          onFocus={() => { if (!disabled) { setFocused(true); if (!open) openDropdown(); } }}
          onKeyDown={onKeyDown}
          readOnly={!open} placeholder="" disabled={disabled} autoComplete="off"
          style={{
            ...getInputStyle(t, { error, focused: open, disabled, padding: '18px 68px 8px 16px', borderRadius: open ? '10px 10px 0 0' : 10 }),
            cursor: disabled ? 'not-allowed' : open ? 'text' : 'pointer',
          }}
        />
        <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} />
        <FieldActions>
          {selected.length > 0 && <ClearButton onClick={handleClear} t={t} disabled={disabled} size={12} stopPropagation />}
          <IconActionButton
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); toggleDropdown(); }}
            t={t} disabled={disabled} ariaLabel={open ? 'Закрыть список' : 'Открыть список'}
          >
            <IcoChevronDown s={16} open={open} />
          </IconActionButton>
        </FieldActions>
        {/* inline-дропдаун живёт внутри поля → обрезается overflow:hidden родителя */}
        {!usePortal && dropdownContent}
      </div>
      <FieldError error={error} t={t} />
      {usePortal && typeof document !== 'undefined' && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </div>
  );
}