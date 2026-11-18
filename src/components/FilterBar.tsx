import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Theme } from '../themes/theme';
import { IcoFilter, IcoX, IcoChevronDown, ExportIcon } from './icons';
import Button from './inputs/Button';
import { useResponsive } from '../context/ResponsiveContext';

interface FilterItem {
  component: ReactNode;
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
 *
 * Чипсы активных фильтров показываются только в свёрнутом виде и только
 * не на мобильном: там их заменяет счётчик `activeCount`.
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

  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyH, setBodyH] = useState(0);

  useEffect(() => {
    if (bodyRef.current) setBodyH(bodyRef.current.scrollHeight);
  }, [filters, open, effectiveCols]);

  /* Высота контента меняется не только от списка фильтров: текст ошибки
     под полем, перенос метки, смена колонки. Без наблюдения за размерами
     тело обрезало бы нижние поля. */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setBodyH(el.scrollHeight);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  /* Свёрнутое тело: maxHeight:0 + overflow:hidden НЕ убирает поля из
     tab-порядка. inert снимает фокус и скрывает поддерево от AT. */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  const rows: Record<number, Array<{ component: ReactNode; cols: number }>> = {};
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

  const showChips = !open && !isMobile && chips.length > 0;

  const chipStyle: CSSProperties = {
    padding: '2px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontFamily: 'system-ui',
    fontWeight: 500,
    color: t.accent,
    background: t.navHoverBg,
    border: `1px solid ${t.border}`,
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <>
      {isMobile && mobileBackdrop && open && (
        <div
          role="presentation"
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
            gap: 12,
            padding: '12px 18px',
          }}
        >
          {/* Вся шапка — одна настоящая кнопка: Enter/Space, aria-expanded.
              Чипсы живут внутри неё отдельной строкой и переносятся свободно. */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={bodyId}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 8,
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              font: 'inherit',
              color: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ color: t.accent, display: 'flex', flexShrink: 0 }}>
                <IcoFilter />
              </span>
              <span
                style={{
                  fontFamily: 'system-ui',
                  fontWeight: 600,
                  fontSize: 14,
                  color: t.text,
                  whiteSpace: 'nowrap',
                }}
              >
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
                    flexShrink: 0,
                  }}
                >
                  {activeCount}
                </span>
              )}
              <span
                aria-hidden
                style={{
                  marginLeft: 'auto',
                  color: t.textMuted,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <IcoChevronDown open={open} />
              </span>
            </span>

            {showChips && (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {chips.map((chip, i) => (
                  <span key={i} title={chip} style={chipStyle}>
                    {chip}
                  </span>
                ))}
              </span>
            )}
          </button>

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
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          id={bodyId}
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