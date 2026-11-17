import { useState, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { IcoChevronLeft, IcoChevronRight, IcoChevronDown } from '../icons';

export interface MobilePaginationProps {
  t: Theme;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number, perPage: number) => void;
  sticky?: boolean;
  stickyOffset?: number;
  perPageOptions?: number[];
  showPerPage?: boolean;
  swipeEnabled?: boolean;
}

/**
 * Мобильная пагинация.
 *
 * Вся панель — одна строка: [<] [page info] [N/стр. ▾] [>].
 * На маленьких экранах экономит ~50px вертикали по сравнению
 * с двухрядной компоновкой.
 */
export function MobilePagination({
  t,
  page,
  perPage,
  total,
  onPageChange,
  sticky = true,
  stickyOffset = 8,
  perPageOptions = [10, 20, 50, 100],
  showPerPage = true,
  swipeEnabled = true,
}: MobilePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const [selectOpen, setSelectOpen] = useState(false);
  const [gotoInput, setGotoInput] = useState<string | null>(null);

  const longPressRef = useRef<number | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = () => {
    longPressRef.current = window.setTimeout(() => setGotoInput(String(page)), 500);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const commitGoto = () => {
    if (gotoInput === null) return;
    const n = parseInt(gotoInput, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(1, Math.min(pages, n));
      if (clamped !== page) onPageChange(clamped, perPage);
    }
    setGotoInput(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeEnabled) return;
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeEnabled || !touchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0 && page > 1) onPageChange(page - 1, perPage);
    else if (dx < 0 && page < pages) onPageChange(page + 1, perPage);
  };

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    flexShrink: 0,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: t.bgSurface,
    color: disabled ? t.placeholder : t.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    padding: 0,
    transition: 'transform 0.12s ease, opacity 0.12s',
  });

  const activePress = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'scale(0.95)';
  };
  const inactivePress = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          ...(sticky
            ? {
                position: 'sticky',
                bottom: `calc(${stickyOffset}px + env(safe-area-inset-bottom, 0px))`,
                zIndex: 20,
              }
            : {}),
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          color: t.text,
          fontSize: 13,
          boxShadow: sticky ? t.shadowLg : undefined,
        }}
      >
        {/* Prev */}
        <button
          type="button"
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1, perPage)}
          onPointerDown={activePress}
          onPointerUp={inactivePress}
          onPointerCancel={inactivePress}
          style={navBtn(page <= 1)}
        >
          <IcoChevronLeft s={16} />
        </button>

        {/* Центр: info + perPage в одной строке */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{ flex: 1, minWidth: 0, userSelect: 'none' }}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
          >
            {gotoInput !== null ? (
              <input
                type="number"
                autoFocus
                inputMode="numeric"
                value={gotoInput}
                onChange={(e) => setGotoInput(e.target.value)}
                onBlur={commitGoto}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitGoto();
                  if (e.key === 'Escape') setGotoInput(null);
                }}
                style={{
                  width: '100%',
                  height: 32,
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 600,
                  border: `1px solid ${t.accent}`,
                  borderRadius: 6,
                  background: t.bgSurface,
                  color: t.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {page}{' '}
                  <span style={{ color: t.textMuted, fontWeight: 400 }}>/ {pages}</span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: t.textMuted,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {start}–{end} из {total.toLocaleString()}
                </div>
              </>
            )}
          </div>

          {showPerPage && (
            <button
              type="button"
              onClick={() => setSelectOpen(true)}
              aria-label={`Записей на странице: ${perPage}. Нажмите, чтобы изменить`}
              style={{
                flexShrink: 0,
                height: 32,
                minWidth: 60,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.bgSurface,
                color: t.text,
                cursor: 'pointer',
              }}
            >
              {perPage} / стр.
              <IcoChevronDown s={10} />
            </button>
          )}
        </div>

        {/* Next */}
        <button
          type="button"
          aria-label="Следующая страница"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1, perPage)}
          onPointerDown={activePress}
          onPointerUp={inactivePress}
          onPointerCancel={inactivePress}
          style={navBtn(page >= pages)}
        >
          <IcoChevronRight s={16} />
        </button>
      </div>

      {selectOpen && (
        <div
          onClick={() => setSelectOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.bgSurface,
              borderRadius: '16px 16px 0 0',
              padding: 8,
              width: '100%',
              maxWidth: 480,
              paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {perPageOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setSelectOpen(false);
                  if (n !== perPage) onPageChange(1, n);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 48,
                  padding: '12px 16px',
                  textAlign: 'center',
                  background: perPage === n ? t.navHoverBg : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: perPage === n ? 600 : 400,
                  color: perPage === n ? t.accent : t.text,
                  cursor: 'pointer',
                }}
              >
                {n} на странице
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}