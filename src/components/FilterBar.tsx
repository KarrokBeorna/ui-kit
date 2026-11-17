import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { IcoFilter, IcoX, IcoChevronDown, ExportIcon } from './icons';
import Button from './inputs/Button';
import { useResponsive } from '../context/ResponsiveContext';

interface FilterItem {
  component: React.ReactNode;
  row: number;
  cols?: number;
}

interface FilterBarProps {
  theme: Theme;
  filters: FilterItem[];
  activeCount?: number;
  chips?: string[];
  onReset?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExport?: () => void;
  exportLabel?: string;
  gridCols?: number;
  mobileMaxHeight?: string;
  scrollable?: boolean;
  mobileBackdrop?: boolean;
}

/**
 * Панель фильтров.
 *
 * ⚠️ Никакого `onApply` — фильтры применяются по мере изменения. Дебаунс —
 * на стороне потребителя: `useFetch(url, params, { debounceMs: 300 })` для
 * серверных фильтров или `useDeferredValue(filters)` для локальных.
 */
export function FilterBar({
  theme: t,
  filters,
  activeCount = 0,
  chips = [],
  onReset,
  open: externalOpen,
  onOpenChange,
  onExport,
  exportLabel = 'Экспорт в Excel',
  gridCols = 1,
  mobileMaxHeight,
  scrollable = true,
  mobileBackdrop = false,
}: FilterBarProps) {
  const { isMobile } = useResponsive();
  const effectiveCols = isMobile ? 1 : gridCols;

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
  }, [filters, open, effectiveCols]);

  const rows: Record<number, Array<{ component: React.ReactNode; cols: number }>> = {};
  filters.forEach(({ component, row, cols = effectiveCols }) => {
    if (!rows[row]) rows[row] = [];
    rows[row].push({ component, cols });
  });
  const sortedRows = Object.keys(rows).sort((a, b) => Number(a) - Number(b));

  const isScrollable = isMobile ? true : scrollable;
  const maxBodyHeight: string | number = open
    ? isMobile
      ? `min(${bodyH || 600}px, ${mobileMaxHeight ?? 'calc(100dvh - 140px)'})`
      : `${bodyH || 600}px`
    : 0;

  return (
    <>
      {isMobile && mobileBackdrop && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 9,
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          marginBottom: 16,
          overflow: 'hidden',
          zIndex: isMobile && mobileBackdrop && open ? 10 : 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            cursor: 'pointer',
            userSelect: 'none',
            gap: 12,
          }}
          onClick={() => setOpen(!open)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: t.accent, display: 'flex' }}>
              <IcoFilter />
            </span>
            <span style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: 14, color: t.text }}>
              Фильтры
            </span>
            {activeCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 20,
                  background: t.accent,
                  color: t.accentText,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'system-ui',
                  boxShadow: `0 0 10px ${t.accentGlow}`,
                }}
              >
                {activeCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {!open && chips.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  maxWidth: isMobile ? 200 : 'none',
                  scrollbarWidth: 'none',
                  flex: '0 1 auto',
                  minWidth: 0,
                }}
              >
                {chips.map((chip, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 9px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontFamily: 'system-ui',
                      fontWeight: 500,
                      color: t.accent,
                      background: t.navHoverBg,
                      border: `1px solid ${t.border}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {activeCount > 0 && onReset && (
                <Button
                  icon={<IcoX s={10} />}
                  variant="danger"
                  outline
                  size="sm"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onReset();
                  }}
                  theme={t}
                >
                  Сбросить
                </Button>
              )}
              <span style={{ color: t.textMuted, display: 'flex' }}>
                <IcoChevronDown open={open} />
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          style={{
            maxHeight: maxBodyHeight,
            overflow: open ? (isScrollable ? 'auto' : 'hidden') : 'hidden',
            overscrollBehavior: 'contain',
            transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              padding: '16px 18px 0',
              borderTop: `1px solid ${t.borderSubtle}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {sortedRows.map((rowKey) => {
              const items = rows[Number(rowKey)];
              return (
                <div
                  key={rowKey}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
                    gap: '14px',
                  }}
                >
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        gridColumn: `span ${Math.min(item.cols, effectiveCols)}`,
                        minWidth: 0,
                      }}
                    >
                      {item.component}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Footer — только если есть что показать (Export / Reset) */}
            {(onExport || onReset) && (
              <div
                style={{
                  position: isMobile ? 'sticky' : 'static',
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 8,
                  paddingBottom: 18,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  background: isMobile ? t.bgSurface : 'transparent',
                  marginLeft: isMobile ? -18 : 0,
                  marginRight: isMobile ? -18 : 0,
                  paddingLeft: isMobile ? 18 : 0,
                  paddingRight: isMobile ? 18 : 0,
                  boxShadow: isMobile ? '0 -4px 12px rgba(0,0,0,0.06)' : 'none',
                }}
              >
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
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onReset();
                    }}
                    theme={t}
                  >
                    Сбросить
                  </Button>
                )}
              </div>
            )}

            {/* Если футера нет — добавим отступ снизу */}
            {!onExport && !onReset && <div style={{ height: 18 }} />}
          </div>
        </div>
      </div>
    </>
  );
}