import React, { useState, useId, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Theme } from '../../themes/theme';
import { IcoChevronDown, IcoCheck } from '../icons';
import { useDropdownPosition } from './_shared/useDropdownPosition';
import {
  getInputStyle,
  FloatingLabel,
  FieldActions,
  ClearButton,
  IconActionButton,
  FieldError,
} from './_shared/field';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  theme: Theme;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  error?: string;
  usePortal?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  label,
  theme: t,
  options,
  value,
  onChange,
  error,
  usePortal = true,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownStyle = useDropdownPosition(open, inputRef, { dropdownRef });

  const selected = options.find(o => o.value === value);
  const floated = focused || open || !!selected;
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (disabled) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [disabled]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setFocused(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [disabled]);

  const openDropdown = () => {
    if (disabled) return;
    if (!open) {
      setOpen(true);
      setFocused(true);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      setQuery('');
      setFocused(false);
      inputRef.current?.blur();
    } else {
      setOpen(true);
      setFocused(true);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleSelect = (opt: SelectOption) => {
    if (disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
    setFocused(false);
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    setTimeout(() => {
      inputRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  };

  const dropdownContent = open && !disabled && (
    <div
      ref={dropdownRef}
      data-dropdown="true"
      style={{
        ...dropdownStyle,
        background: t.dropdownBg,
        border: `1.5px solid ${t.borderFocus}`,
        overflowY: 'auto',
        boxShadow: t.shadowLg,
        animation: 'dropDown 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxSizing: 'border-box',
      }}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '12px 16px', color: t.placeholder, fontSize: 14 }}>
          Ничего не найдено
        </div>
      ) : (
        filtered.map(opt => (
          <div
            key={opt.value}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(opt);
            }}
            style={{
              padding: '12px 16px',
              fontSize: 14,
              cursor: 'pointer',
              color: opt.value === value ? t.dropdownSelectedText : t.text,
              background: opt.value === value ? t.dropdownSelected : 'transparent',
              transition: 'background 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              touchAction: 'manipulation',
            }}
            onPointerEnter={e => {
              if (e.pointerType === 'mouse' && opt.value !== value) {
                e.currentTarget.style.background = t.dropdownHover;
              }
            }}
            onPointerLeave={e => {
              if (e.pointerType === 'mouse') {
                e.currentTarget.style.background =
                  opt.value === value ? t.dropdownSelected : 'transparent';
              }
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: `1.5px solid ${opt.value === value ? t.accent : t.border}`,
                background: opt.value === value ? t.accent : 'transparent',
                transition: 'all 0.15s',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {opt.value === value && <IcoCheck s={10} style={{ stroke: '#fff' }} />}
            </div>
            {opt.label}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseDown={e => {
          e.preventDefault();
          if (!disabled) openDropdown();
        }}
      >
        <input
          ref={inputRef}
          id={id}
          value={open ? query : selected?.label ?? ''}
          onChange={e => {
            if (!disabled) setQuery(e.target.value);
          }}
          onFocus={() => {
            if (!disabled) {
              setFocused(true);
              if (!open) openDropdown();
            }
          }}
          readOnly={!open}
          placeholder=""
          disabled={disabled}
          style={{
            ...getInputStyle(t, {
              error,
              focused: open,
              disabled,
              padding: '18px 68px 8px 16px',
              borderRadius: open ? '10px 10px 0 0' : 10,
            }),
            cursor: disabled ? 'not-allowed' : open ? 'text' : 'pointer',
          }}
          autoComplete="off"
        />
        <FloatingLabel htmlFor={id} label={label} floated={floated} error={error} t={t} />

        <FieldActions>
          {value && (
            <ClearButton
              onClick={handleClear}
              t={t}
              disabled={disabled}
              size={12}
              stopPropagation
            />
          )}
          <IconActionButton
            onMouseDown={e => {
              e.stopPropagation();
              e.preventDefault();
              toggleDropdown();
            }}
            t={t}
            disabled={disabled}
            ariaLabel={open ? 'Закрыть список' : 'Открыть список'}
          >
            <IcoChevronDown s={16} open={open} />
          </IconActionButton>
        </FieldActions>
      </div>

      <FieldError error={error} t={t} />

      {usePortal ? ReactDOM.createPortal(dropdownContent, document.body) : dropdownContent}

      <style>{`
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}