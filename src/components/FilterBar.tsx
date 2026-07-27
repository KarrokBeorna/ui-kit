import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { IcoFilter, IcoX, IcoChevronDown, IcoSearch, ExportIcon } from './icons';
import { Button } from './Button';

interface FilterItem {
  component: React.ReactNode;
  row: number;
  cols?: number;
}

interface FilterBarProps {
  theme: Theme;
  /** Список фильтров с указанием строки и количеством колонок */
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
  /** Коллбэк при нажатии "Экспорт в Excel" */
  onExport?: () => void;
  /** Текст кнопки экспорта (по умолчанию "Экспорт в Excel") */
  exportLabel?: string;
  /** Общее количество колонок в сетке (по умолчанию 1) */
  gridCols?: number;
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
  onExport,
  exportLabel = 'Экспорт в Excel',
  gridCols = 1,
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
  }, [applyOnEnter, onApply, bodyRef.current]);

  const rows: Record<number, Array<{ component: React.ReactNode; cols: number }>> = {};
  filters.forEach(({ component, row, cols = gridCols }) => {
    if (!rows[row]) rows[row] = [];
    rows[row].push({ component, cols });
  });
  const sortedRows = Object.keys(rows).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: 'pointer', userSelect: 'none', gap: 12 }}
        onClick={() => setOpen(!open)}
      >
        {/* ... иконка фильтра и бейдж ... */}
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
            <Button
              icon={<IcoX s={10} />}
              variant="danger"
              outline
              size="sm"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              theme={t}
            >
              Сбросить
            </Button>
          )}
          <span style={{ color: t.textMuted, display: 'flex' }}><IcoChevronDown open={open} /></span>
        </div>
      </div>

      {/* Collapsible body */}
      <div ref={bodyRef} style={{ maxHeight: open ? bodyH || 600 : 0, overflow: 'hidden', transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ padding: '16px 18px 0', borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedRows.map((rowKey) => {
            const items = rows[Number(rowKey)];
            return (
              <div
                key={rowKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: '14px',
                }}
              >
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      gridColumn: `span ${Math.min(item.cols, gridCols)}`,
                      minWidth: 0,
                    }}
                  >
                    {item.component}
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {onApply && !instantApply && (
              <Button
                icon={<IcoSearch s={12} />}
                variant="primary"
                size="md"
                onClick={onApply}
                theme={t}
              >
                Применить
              </Button>
            )}

            {onExport && (
              <Button
                icon={<ExportIcon s={12} />}
                variant="primary"
                outline
                size="md"
                onClick={onExport}
                theme={t}
              >
                {exportLabel}
              </Button>
            )}

            {onReset && (
              <Button
                icon={<IcoX s={12} />}
                variant="danger"
                outline
                size="md"
                onClick={(e) => { e.stopPropagation(); onReset(); }}
                theme={t}
              >
                Сбросить
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}