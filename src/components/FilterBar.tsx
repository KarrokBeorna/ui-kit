import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../themes/theme';
import {IcoFilter, IcoX, IcoChevronDown, IcoSearch} from './icons';

interface FilterItem {
  component: React.ReactNode;
  row: number;
}

interface FilterBarProps {
  theme: Theme;
  /** Список фильтров с указанием строки */
  filters: FilterItem[];
  /** Количество активных фильтров (для бейджа) */
  activeCount?: number;
  /** Краткое описание активных фильтров (чипы) */
  chips?: string[];
  /** Коллбэк при нажатии "Apply" */
  onApply?: () => void;
  /** Коллбэк при нажатии "Reset" или "Clear all" */
  onReset?: () => void;
  /** Внешний контроль открытого состояния (опционально) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Если true – кнопка "Применить" не отображается, фильтры применяются мгновенно */
  instantApply?: boolean;
  /** Если true – нажатие Enter в любом поле ввода внутри фильтров вызывает onApply */
  applyOnEnter?: boolean;
}

export function FilterBar({
  theme: t,
  filters,
  activeCount = 0,
  chips = [],
  onApply,
  onReset,
  open: externalOpen,
  onOpenChange,
  instantApply = false,
  applyOnEnter = false,
}: FilterBarProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyH, setBodyH] = useState(0);
  useEffect(() => {
    if (bodyRef.current) setBodyH(bodyRef.current.scrollHeight);
  }, [filters, open]);

  // Обработчик Enter внутри фильтров
  useEffect(() => {
    if (!applyOnEnter || !onApply) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === 'Enter' &&
        bodyRef.current &&
        bodyRef.current.contains(target)
      ) {
        e.preventDefault();
        onApply();
      }
    };

    const node = bodyRef.current;
    if (node) {
      node.addEventListener('keydown', handleKeyDown);
      return () => node.removeEventListener('keydown', handleKeyDown);
    }
  }, [applyOnEnter, onApply, bodyRef.current]); // зависимость от ref.current для перепривязки

  // Группировка фильтров по строкам
  const rows: Record<number, React.ReactNode[]> = {};
  filters.forEach(({ component, row }) => {
    if (!rows[row]) rows[row] = [];
    rows[row].push(component);
  });
  const sortedRows = Object.keys(rows).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: 'pointer', userSelect: 'none', gap: 12 }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: t.accent, display: 'flex' }}><IcoFilter /></span>
          <span style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: 14, color: t.text }}>Фильтры</span>
          {activeCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 20, background: t.accent, color: t.accentText, fontSize: 11, fontWeight: 700, fontFamily: 'system-ui', boxShadow: `0 0 10px ${t.accentGlow}` }}>
              {activeCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!open && chips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chips.map((chip, i) => (
                <span key={i} style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontFamily: 'system-ui', fontWeight: 500, color: t.accent, background: t.navHoverBg, border: `1px solid ${t.border}` }}>{chip}</span>
              ))}
            </div>
          )}
          {activeCount > 0 && onReset && (
            <button onClick={(e) => { e.stopPropagation(); onReset(); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.danger, fontSize: 12, fontFamily: 'system-ui', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = `${t.danger}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <IcoX s={10} /> Сбросить
            </button>
          )}
          <span style={{ color: t.textMuted, display: 'flex' }}><IcoChevronDown open={open} /></span>
        </div>
      </div>

      {/* Collapsible body */}
      <div ref={bodyRef} style={{ maxHeight: open ? bodyH || 600 : 0, overflow: 'hidden', transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ padding: '16px 18px 0', borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedRows.map((rowKey) => (
            <div key={rowKey} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {rows[Number(rowKey)].map((comp, idx) => (
                <div key={idx} style={{ flex: '1 1 160px', minWidth: 120 }}>
                  {comp}
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Кнопка "Применить" отображается только если задан onApply и НЕ включен instantApply */}
            {onApply && !instantApply && (
              <button
                onClick={onApply}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: t.accent,
                  color: t.accentText,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'system-ui',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  boxShadow: `0 2px 14px ${t.accentGlow}`
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'
              }>
                <IcoSearch s={12} /> Применить
              </button>
            )}
            {onReset && (
              <button
                onClick={(e) => { e.stopPropagation(); onReset(); }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.danger,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'system-ui',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  boxShadow: `0 2px 14px ${t.accentGlow}`
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${t.danger}15`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <IcoX s={10} /> Сбросить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}