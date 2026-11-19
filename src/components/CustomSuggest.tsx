// CustomSuggest.tsx — поле «поиск с подсказками»: произвольные элементы, свой рендер опции,
// клавиатура, портал. Заменяет самописные саджесты в проектах.
import React, { useId, useLayoutEffect, useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import { watchLayout } from '../hooks';
import { getInputStyle, FloatingLabel, FieldActions, ClearButton, FieldError } from './field';

export interface CustomSuggestProps<T> {
  /** Плавающая метка. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /** Текущий текст запроса. */
  value: string;
  /** Колбэк изменения текста. */
  onChange: (value: string) => void;
  /** Полный список кандидатов. */
  items: T[];
  /**Predicate совпадения элемента с запросом. */
  filter: (item: T, query: string) => boolean;
  /** Ключ элемента для списка. */
  optionKey: (item: T) => string | number;
  /** Рендер опции (можно подсветить совпадения через highlightText). */
  renderOption: (item: T, query: string) => ReactNode;
  /** Выбор опции. Поле очищается автоматически. */
  onSelect: (item: T) => void;
  /** Максимум опций в списке. @default 50 */
  maxItems?: number;
  /** Текст при отсутствии совпадений. @default 'Ничего не найдено' */
  emptyText?: string;
  /** Блокировка поля. */
  disabled?: boolean;
  /** Текст ошибки под полем. */
  error?: string;
  /** Рендерить список в portal. @default true */
  usePortal?: boolean;
}

/** Поле ввода с выпадающими подсказками и клавиатурной навигацией. */
export default function CustomSuggest<T>({
  label, theme: t, value, onChange, items, filter, optionKey, renderOption, onSelect,
  maxItems = 50, emptyText = 'Ничего не найдено', disabled = false, error, usePortal = true,
}: CustomSuggestProps<T>) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<React.CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  const id = useId();
  const listId = `${id}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const filtered = useMemo(() => {
    if (!query) return [];
    const out: T[] = [];
    for (const it of items) { if (filter(it, query)) { out.push(it); if (out.length >= maxItems) break; } }
    return out;
  }, [items, query, filter, maxItems]);

  const show = open && !!query && !disabled;
  const floated = focused || value.length > 0;

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!show || !input) return;
    const update = () => {
      const r = input.getBoundingClientRect();
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight, vTop = vv?.offsetTop ?? 0;
      const h = listRef.current?.offsetHeight || 320;
      const below = vTop + vh - r.bottom - 12;
      const above = r.top - vTop - 12;
      const up = below < Math.min(h, 200) && above > below;
      const maxH = Math.max(140, up ? above : below);
      setPos({
        position: 'fixed', visibility: 'visible', zIndex: 9999,
        left: Math.max(8, r.left), width: r.width, maxHeight: maxH, overflowY: 'auto',
        top: up ? Math.max(vTop + 8, r.top - 4 - Math.min(h, maxH)) : r.bottom + 4,
        borderRadius: up ? '10px 10px 0 0' : '0 0 10px 10px',
      });
    };
    update();
    const raf = requestAnimationFrame(update);
    const stop = watchLayout(input, update);
    return () => { cancelAnimationFrame(raf); stop(); };
  }, [show, filtered.length]);

  useEffect(() => {
    if (!show) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [show]);

  useEffect(() => { setHi(0); }, [query]);
  useEffect(() => {
    if (show) listRef.current?.querySelector(`[data-idx="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi, show]);

  const pick = (item: T) => { onSelect(item); onChange(''); setOpen(false); setFocused(false); inputRef.current?.blur(); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!show || !filtered.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % filtered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + filtered.length) % filtered.length); }
    else if (e.key === 'Enter' && filtered[hi]) { e.preventDefault(); pick(filtered[hi]); }
  };

  const list = show && (
    <div ref={listRef} id={listId} role="listbox" aria-label={label} data-dropdown="true"
      style={{
        ...(usePortal ? pos : { position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', maxHeight: 320, overflowY: 'auto', zIndex: 20, borderRadius: '0 0 10px 10px' }),
        background: t.dropdownBg, border: `1.5px solid ${t.borderFocus}`, boxShadow: t.shadowLg, boxSizing: 'border-box',
      }}>
      {filtered.length === 0
        ? <div style={{ padding: '12px 16px', color: t.placeholder, fontSize: 14 }}>{emptyText}</div>
        : filtered.map((item, idx) => (
          <div key={optionKey(item)} data-idx={idx} id={`${listId}-${idx}`} role="option" aria-selected={idx === hi}
            onPointerDown={(e) => e.preventDefault()} onClick={() => pick(item)}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHi(idx); }}
            style={{
              padding: '10px 14px', cursor: 'pointer', background: idx === hi ? t.dropdownHover : 'transparent',
              transition: 'background 0.12s ease', minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
            {renderOption(item, query)}
          </div>
        ))}
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef} id={id} type="text" value={value} disabled={disabled} autoComplete="off"
          role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={show && filtered[hi] ? `${listId}-${hi}` : undefined}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); if (query) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          style={getInputStyle(t, { error, focused, disabled, padding: '18px 44px 8px 16px', borderRadius: show ? '10px 10px 0 0' : 10 })}
        />
        <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} />
        {value && (
          <FieldActions>
            <ClearButton t={t} disabled={disabled} stopPropagation onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }} />
          </FieldActions>
        )}
        {!usePortal && list}
      </div>
      <FieldError error={error} t={t} />
      {usePortal && typeof document !== 'undefined' && list ? createPortal(list, document.body) : null}
    </div>
  );
}