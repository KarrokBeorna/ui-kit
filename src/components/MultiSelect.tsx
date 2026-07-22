// MultiSelect.tsx
import React, { useState, useId, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Theme } from '../themes/theme';
import type { SelectOption } from './SearchableSelect';
import { IcoChevronDown, IcoX, IcoCheck } from './icons';

interface MultiSelectProps {
  label: string;
  theme: Theme;
  options: SelectOption[];
  value: string[];
  onChange: (vals: string[]) => void;
  error?: string;
  usePortal?: boolean;
}

function pluralValue(n: number) {
  if (n === 1) return `${n} значение`;
  if (n >= 2 && n <= 4) return `${n} значения`;
  return `${n} значений`;
}

export default function MultiSelect({
  label, theme: t, options, value, onChange, error,
  usePortal = true,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const floated = focused || open || value.length > 0;
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every(o => value.includes(o.value));
  const someFilteredSelected = filtered.some(o => value.includes(o.value));

  // Закрытие при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery(''); setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setFocused(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Позиционирование дропдауна – строго по ширине input
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true); setFocused(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const toggle = (val: string) =>
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val]);

  const toggleAll = () => {
    if (allFilteredSelected) {
      onChange(value.filter(v => !filtered.some(o => o.value === v)));
    } else {
      const toAdd = filtered.filter(o => !value.includes(o.value)).map(o => o.value);
      onChange([...value, ...toAdd]);
    }
  };

  const displayValue = (() => {
    if (value.length === 0) return '';
    if (value.length === 1) return options.find(o => o.value === value[0])?.label ?? '';
    return pluralValue(value.length);
  })();

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); onChange([]); setOpen(false); setQuery('');
  };

  const dropdownContent = open && (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: t.dropdownBg,
        border: `1.5px solid ${t.borderFocus}`,
        borderRadius: '0 0 10px 10px',
        maxHeight: 300,
        overflowY: 'auto',
        boxShadow: t.shadowLg,
        animation: 'dropDown 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxSizing: 'border-box',
      }}
    >
      <div
        onMouseDown={e => { e.preventDefault(); toggleAll(); }}
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = t.dropdownHover}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 16, height: 16, borderRadius: 4,
          border: `1.5px solid ${allFilteredSelected || someFilteredSelected ? t.accent : t.border}`,
          background: allFilteredSelected ? t.accent : 'transparent',
          transition: 'all 0.15s', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {allFilteredSelected ? (
            <IcoCheck s={10} style={{ stroke: '#fff' }} />
          ) : someFilteredSelected ? (
            <div style={{ width: 8, height: 2, background: t.accent, borderRadius: 1 }} />
          ) : null}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.accent }}>
          Выбрать все {query ? `(${filtered.length})` : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '12px 16px', color: t.placeholder, fontSize: 14 }}>Ничего не найдено</div>
      ) : filtered.map(opt => {
        const sel = value.includes(opt.value);
        return (
          <div
            key={opt.value}
            onMouseDown={e => { e.preventDefault(); toggle(opt.value); }}
            style={{
              padding: '10px 16px', fontSize: 14, cursor: 'pointer',
              color: sel ? t.dropdownSelectedText : t.text,
              background: sel ? t.dropdownSelected : 'transparent',
              transition: 'background 0.15s ease',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = t.dropdownHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = sel ? t.dropdownSelected : 'transparent'; }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              border: `1.5px solid ${sel ? t.accent : t.border}`,
              background: sel ? t.accent : 'transparent',
              transition: 'all 0.15s', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {sel && <IcoCheck s={10} style={{ stroke: '#fff' }} />}
            </div>
            {opt.label}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleOpen}>
        <input
          ref={inputRef}
          id={id}
          value={open ? query : displayValue}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (!open) handleOpen(); }}
          readOnly={!open}
          placeholder=""
          style={{
            width: '100%', boxSizing: 'border-box',
            background: t.bg,
            border: `1.5px solid ${error ? t.danger : open ? t.borderFocus : t.border}`,
            borderRadius: open ? '10px 10px 0 0' : 10,
            padding: '18px 68px 8px 16px',
            fontSize: 15, color: t.text, outline: 'none',
            cursor: open ? 'text' : 'pointer',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease, border-radius 0.15s ease',
            boxShadow: open ? `0 0 0 3px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit',
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: 'absolute', left: 14,
            top: floated ? 0 : '50%',
            transform: floated ? 'translateY(-50%) scale(0.78)' : 'translateY(-50%)',
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

        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {value.length > 0 && (
            <button
              type="button"
              onMouseDown={handleClear}
              style={{
                width: 28, height: 28, background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.iconColor, borderRadius: 6, transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = t.text)}
              onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
            >
              <IcoX s={12} />
            </button>
          )}
          <div style={{ color: t.iconColor, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <IcoChevronDown s={16} open={open} />
          </div>
        </div>
      </div>

      {error && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: t.danger }}>{error}</p>}

      {usePortal
        ? ReactDOM.createPortal(dropdownContent, document.body)
        : dropdownContent
      }

      <style>{`
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}