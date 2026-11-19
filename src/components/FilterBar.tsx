// FilterBar.tsx — сворачиваемая панель фильтров (применение по мере изменения).
//
// ИЗМЕНЕНИЕ: футер больше не «просвечивает» метками полей при скролле тела.
// Каждая ячейка фильтра изолирована (position:relative + zIndex:0 — плавающая
// метка с zIndex:1 остаётся внутри своей ячейки), а липкий футер поднят на zIndex:3
// и всегда непрозрачен. Футер липкий и на десктопе, когда тело скроллится.

import {
  useState, useRef, useEffect, useId, type CSSProperties, type ReactNode,
} from 'react';
import type { Theme } from '../themes/theme';
import { IcoFilter, IcoX, IcoChevronDown, ExportIcon } from './icons';
import Button from './Button';
import { useResponsive } from '../context/AppContext';
import { useStyleTag } from '../hooks';

export interface FilterItem {
  /** Компонент фильтра. */
  component: ReactNode;
  /** Строка сетки (0-based). */
  row: number;
  /** Сколько колонок занимает. */
  cols?: number;
}

export interface FilterBarProps {
  /** Тема оформления. */
  theme: Theme;
  /** Фильтры. */
  filters: FilterItem[];
  /** Количество активных фильтров (бейдж). */
  activeCount?: number;
  /** Чипсы активных фильтров (в свёрнутом виде, десктоп). */
  chips?: string[];
  /** Сброс всех фильтров. */
  onReset?: () => void;
  /** Controlled-раскрытость. */
  open?: boolean;
  /** Колбэк раскрытия. */
  onOpenChange?: (open: boolean) => void;
  /** Экспорт (кнопка в футере). */
  onExport?: () => void;
  /** Подпись экспорта. @default 'Экспорт в Excel' */
  exportLabel?: string;
  /** Колонок сетки (десктоп). @default 1 */
  gridCols?: number;
  /** Максимальная высота тела на мобильном. */
  mobileMaxHeight?: string;
  /** Скролл тела (десктоп). @default true */
  scrollable?: boolean;
  /** Затемнение фона на мобильном при раскрытии. */
  mobileBackdrop?: boolean;
}

const CSS = `
.kbs-filter-toggle { -webkit-tap-highlight-color: transparent; }
.kbs-filter-toggle:focus-visible { outline: 2px solid var(--kbs-fb-accent); outline-offset: -2px; }
@media (hover: hover) { .kbs-filter-toggle:hover { background: var(--kbs-fb-hover) !important; } }
`;

/** Панель фильтров. Шапка кликабельна целиком (кроме «Сбросить»). Дебаунс — на стороне потребителя. */
export function FilterBar({
  theme: t, filters, activeCount = 0, chips = [], onReset,
  open: externalOpen, onOpenChange, onExport, exportLabel = 'Экспорт в Excel',
  gridCols = 1, mobileMaxHeight, scrollable = true, mobileBackdrop = false,
}: FilterBarProps) {
  useStyleTag('kbs-filter-bar-css', CSS);
  const { isMobile } = useResponsive();
  const effectiveCols = isMobile ? 1 : gridCols;
  const [internalOpen, setInternalOpen] = useState(true);
  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (externalOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyH, setBodyH] = useState(0);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setBodyH(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [filters, effectiveCols]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert'); else el.setAttribute('inert', '');
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
    padding: '2px 9px', borderRadius: 20, fontSize: 11, fontFamily: 'system-ui', fontWeight: 500,
    color: t.accent, background: t.navHoverBg, border: `1px solid ${t.border}`,
    whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const hasFooter = !!onExport || !!onReset;

  return (
    <>
      {isMobile && mobileBackdrop && open && (
        <div role="presentation" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9 }} />
      )}
      <div style={{
        position: 'relative', background: t.bgSurface, border: `1px solid ${t.border}`,
        borderRadius: 14, marginBottom: 16, overflow: 'hidden',
        zIndex: isMobile && mobileBackdrop && open ? 10 : 'auto',
        '--kbs-fb-accent': t.accent, '--kbs-fb-hover': t.navHoverBg,
      } as CSSProperties}>
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', gap: 12, userSelect: 'none',
        }}>
          <button type="button" className="kbs-filter-toggle" onClick={() => setOpen(!open)}
            aria-expanded={open} aria-controls={bodyId}
            aria-label={open ? 'Свернуть фильтры' : 'Развернуть фильтры'}
            style={{
              position: 'absolute', inset: 0, padding: 0, margin: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', zIndex: 0, touchAction: 'manipulation',
            }} />
          <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ color: t.accent, display: 'flex' }}><IcoFilter /></span>
            <span style={{ fontFamily: 'system-ui', fontWeight: 600, fontSize: 14, color: t.text, whiteSpace: 'nowrap' }}>Фильтры</span>
            {activeCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 20, height: 20, padding: '0 6px', borderRadius: 20,
                background: t.accent, color: t.accentText, fontSize: 11, fontWeight: 700,
                fontFamily: 'system-ui', boxShadow: `0 0 10px ${t.accentGlow}`,
              }}>{activeCount}</span>
            )}
          </div>
          <div style={{
            position: 'relative', zIndex: 1, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flex: '0 1 auto', minWidth: 0,
          }}>
            {showChips && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
                {chips.map((chip, i) => <span key={i} title={chip} style={chipStyle}>{chip}</span>)}
              </div>
            )}
            {activeCount > 0 && onReset && (
              <div style={{ pointerEvents: 'auto', flexShrink: 0, display: 'flex' }}>
                <Button icon={<IcoX s={10} />} variant="danger" outline size="sm" theme={t}
                  onClick={(e) => { e.stopPropagation(); onReset(); }}>
                  Сбросить
                </Button>
              </div>
            )}
            <span aria-hidden style={{ color: t.textMuted, display: 'flex', flexShrink: 0 }}>
              <IcoChevronDown open={open} />
            </span>
          </div>
        </div>

        <div ref={bodyRef} id={bodyId} style={{
          maxHeight: maxBodyHeight, overflow: open ? (isScrollable ? 'auto' : 'hidden') : 'hidden',
          overscrollBehavior: 'contain', transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ padding: '16px 18px 0', borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedRows.map((rowKey) => (
              <div key={rowKey} style={{ display: 'grid', gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`, gap: 14 }}>
                {rows[Number(rowKey)].map((item, idx) => (
                  // position+zIndex:0 isolирует стекинг ячейки: плавающие метки (zIndex:1)
                  // не всплывают над липким футером.
                  <div key={idx} style={{
                    gridColumn: `span ${Math.min(item.cols, effectiveCols)}`,
                    minWidth: 0, position: 'relative', zIndex: 0,
                  }}>
                    {item.component}
                  </div>
                ))}
              </div>
            ))}
            {hasFooter && (
              <div style={{
                position: isScrollable ? 'sticky' : 'static', bottom: 0, zIndex: 3,
                display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 14,
                flexWrap: 'wrap', justifyContent: 'flex-end',
                background: t.bgSurface, borderTop: `1px solid ${t.borderSubtle}`,
                marginLeft: -18, marginRight: -18, paddingLeft: 18, paddingRight: 18,
                boxShadow: isScrollable ? '0 -6px 14px rgba(0,0,0,0.10)' : 'none',
              }}>
                {onExport && (
                  <Button icon={<ExportIcon s={12} />} variant="primary" outline size="md" onClick={onExport} theme={t}>
                    {exportLabel}
                  </Button>
                )}
                {onReset && (
                  <Button icon={<IcoX s={12} />} variant="danger" outline size="md" theme={t}
                    onClick={(e) => { e.stopPropagation(); onReset(); }}>
                    Сбросить
                  </Button>
                )}
              </div>
            )}
            {!hasFooter && <div style={{ height: 18 }} />}
          </div>
        </div>
      </div>
    </>
  );
}