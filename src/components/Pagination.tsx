// Pagination.tsx — единая пагинация: десктоп-панель и мобильная компактная
// строка (свайп, long-press для перехода, bottom-sheet выбора perPage).
// Режим выбирается автоматически через useResponsive().

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../themes/theme';
import { IcoChevronLeft, IcoChevronRight, IcoChevronDown } from './icons';
import { useResponsive } from '../context/AppContext';
import { useBodyScrollLock } from '../hooks';

export interface PaginationProps {
  /** Тема оформления. */
  t: Theme;
  /** Всего записей. */
  total: number;
  /** Записей на странице по умолчанию. @default 10 */
  defaultPerPage?: number;
  /** Controlled-страница (1-based). Без пропа — uncontrolled. */
  page?: number;
  /** Колбэк смены страницы/размера. */
  onPageChange?: (page: number, perPage: number) => void;
  /** Варианты записей на странице. @default [10,20,50,100,500,1000] */
  perPageOptions?: number[];
  /** Показывать выбор perPage. @default true */
  showPerPage?: boolean;
  /** mobile: липкая панель внизу. @default true */
  sticky?: boolean;
  /** mobile: отступ липкой панели, px. @default 8 */
  stickyOffset?: number;
  /** mobile: свайп влево/вправо листает страницы. @default true */
  swipeEnabled?: boolean;
}

/** Пагинация. На узком экране автоматически превращается в мобильную панель. */
export function Pagination({
  t, total, defaultPerPage = 10, page: externalPage, onPageChange,
  perPageOptions = [10, 20, 50, 100, 500, 1000],
  showPerPage = true, sticky = true, stickyOffset = 8, swipeEnabled = true,
}: PaginationProps) {
  const { isMobile } = useResponsive();
  const [internalPage, setInternalPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const page = externalPage !== undefined ? externalPage : internalPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  useEffect(() => { setPerPage(defaultPerPage); }, [defaultPerPage]);
  useEffect(() => {
    if (externalPage === undefined) setInternalPage((p) => Math.min(p, totalPages));
  }, [totalPages, externalPage]);

  const goTo = useCallback((p: number) => {
    const newPage = Math.max(1, Math.min(totalPages, p));
    if (externalPage === undefined) setInternalPage(newPage);
    onPageChangeRef.current?.(newPage, perPage);
  }, [totalPages, externalPage, perPage]);

  const changePerPage = useCallback((n: number) => {
    setPerPage(n);
    if (externalPage === undefined) setInternalPage(1);
    onPageChangeRef.current?.(1, n);
  }, [externalPage]);

  return isMobile ? (
    <MobileBar t={t} page={page} perPage={perPage} total={total} totalPages={totalPages}
      start={start} end={end} goTo={goTo} changePerPage={changePerPage}
      perPageOptions={perPageOptions} showPerPage={showPerPage}
      sticky={sticky} stickyOffset={stickyOffset} swipeEnabled={swipeEnabled} />
  ) : (
    <DesktopBar t={t} page={page} perPage={perPage} total={total} totalPages={totalPages}
      start={start} end={end} goTo={goTo} changePerPage={changePerPage}
      perPageOptions={perPageOptions} showPerPage={showPerPage} />
  );
}

/* ───────────────────────── Общие пропсы вариантов ───────────────────────── */

interface BarProps {
  t: Theme; page: number; perPage: number; total: number; totalPages: number;
  start: number; end: number;
  goTo: (p: number) => void; changePerPage: (n: number) => void;
  perPageOptions: number[]; showPerPage: boolean;
}

/* ───────────────────────── Desktop ───────────────────────── */

function DesktopBar({ t, page, perPage, total, totalPages, start, end, goTo, changePerPage, perPageOptions, showPerPage }: BarProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, openUp: true });

  useEffect(() => {
    if (!dropOpen) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!dropRef.current?.contains(target) && !btnRef.current?.contains(target)) setDropOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDropOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [dropOpen]);

  useEffect(() => {
    if (!dropOpen || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = rect.top >= 220 || rect.top > spaceBelow;
    setDropPos({ top: openUp ? rect.top - 8 : rect.bottom + 8, left: rect.left, openUp });
  }, [dropOpen]);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 34, height: 34, padding: '0 6px', borderRadius: 8,
    border: `1px solid ${t.border}`, background: t.bgSurface, color: t.textMuted,
    fontSize: 13, fontFamily: 'system-ui', cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', fontWeight: 500,
  };

  const dropdown = dropOpen ? createPortal(
    <div ref={dropRef} data-dropdown="true" role="menu" style={{
      position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: 120,
      background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 10,
      padding: 4, boxShadow: t.shadowLg, zIndex: 1000,
      transform: dropPos.openUp ? 'translateY(-100%)' : 'none',
      transformOrigin: dropPos.openUp ? 'bottom left' : 'top left',
    }}>
      {perPageOptions.map((n) => (
        <button key={n} type="button" role="menuitemradio" aria-checked={perPage === n}
          onClick={() => { changePerPage(n); setDropOpen(false); }}
          style={{
            display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left',
            background: perPage === n ? t.navHoverBg : 'transparent', border: 'none', borderRadius: 7,
            fontSize: 13, fontFamily: 'system-ui', color: perPage === n ? t.accent : t.text,
            cursor: 'pointer', fontWeight: perPage === n ? 600 : 400, transition: 'background 0.15s',
          }}>
          {n} строк
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', borderTop: `1px solid ${t.border}`, flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 13, color: t.textMuted, fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>
          Отображены <strong style={{ color: t.text }}>{start}–{end}</strong> из{' '}
          <strong style={{ color: t.text }}>{total.toLocaleString()}</strong> строк
        </span>
        {showPerPage && (
          <button ref={btnRef} type="button" onClick={() => setDropOpen((p) => !p)}
            aria-haspopup="menu" aria-expanded={dropOpen}
            style={{
              ...btn, padding: '0 10px', gap: 6, color: t.text,
              background: dropOpen ? t.navHoverBg : t.bgSurface,
              borderColor: dropOpen ? t.accent : t.border,
              boxShadow: dropOpen ? `0 0 0 2px ${t.accentGlow}` : 'none',
            }}>
            <span>{perPage} / страницу</span>
            <IcoChevronDown s={11} open={dropOpen} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" aria-label="Предыдущая страница" onClick={() => goTo(page - 1)} disabled={page === 1}
          style={{ ...btn, opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
          <IcoChevronLeft s={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} style={{ color: t.textMuted, fontSize: 13, padding: '0 4px', userSelect: 'none' }}>…</span>
          ) : (
            <button key={p} type="button" onClick={() => goTo(p)}
              aria-current={page === p ? 'page' : undefined}
              style={{
                ...btn,
                background: page === p ? t.accent : t.bgSurface,
                color: page === p ? t.accentText : t.textMuted,
                borderColor: page === p ? 'transparent' : t.border,
                fontWeight: page === p ? 700 : 500,
                boxShadow: page === p ? `0 2px 12px ${t.accentGlow}` : 'none',
              }}>
              {p}
            </button>
          ),
        )}
        <button type="button" aria-label="Следующая страница" onClick={() => goTo(page + 1)} disabled={page === totalPages}
          style={{ ...btn, opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
          <IcoChevronRight s={14} />
        </button>
      </div>
      {dropdown}
    </div>
  );
}

/* ───────────────────────── Mobile ───────────────────────── */

function MobileBar({
  t, page, perPage, total, totalPages, start, end, goTo, changePerPage,
  perPageOptions, showPerPage, sticky, stickyOffset, swipeEnabled,
}: BarProps & { sticky: boolean; stickyOffset: number; swipeEnabled: boolean }) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [gotoInput, setGotoInput] = useState<string | null>(null);
  const longPressRef = useRef<number | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  useBodyScrollLock(selectOpen);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }, []);
  useEffect(() => cancelLongPress, [cancelLongPress]);

  useEffect(() => {
    if (!selectOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectOpen]);

  const startLongPress = () => {
    cancelLongPress();
    longPressRef.current = window.setTimeout(() => setGotoInput(String(page)), 500);
  };
  const commitGoto = () => {
    if (gotoInput === null) return;
    const n = parseInt(gotoInput, 10);
    if (!isNaN(n)) goTo(n);
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
    if (dx > 0 && page > 1) goTo(page - 1);
    else if (dx < 0 && page < totalPages) goTo(page + 1);
  };

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgSurface,
    color: disabled ? t.placeholder : t.text, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, padding: 0, transition: 'transform 0.12s ease, opacity 0.12s',
  });
  const press = (e: React.PointerEvent<HTMLButtonElement>) => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'scale(0.95)'; };
  const unpress = (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(1)'; };

  return (
    <>
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{
        ...(sticky ? { position: 'sticky', bottom: `calc(${stickyOffset}px + env(safe-area-inset-bottom, 0px))`, zIndex: 20 } : null),
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
        background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12,
        color: t.text, fontSize: 13, boxShadow: sticky ? t.shadowLg : undefined,
      }}>
        <button type="button" aria-label="Предыдущая страница" disabled={page <= 1}
          onClick={() => goTo(page - 1)} onPointerDown={press} onPointerUp={unpress} onPointerCancel={unpress}
          style={navBtn(page <= 1)}>
          <IcoChevronLeft s={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0, userSelect: 'none' }}
            onTouchStart={startLongPress} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
            {gotoInput !== null ? (
              <input type="number" autoFocus inputMode="numeric" value={gotoInput}
                onChange={(e) => setGotoInput(e.target.value)}
                onBlur={commitGoto}
                onKeyDown={(e) => { if (e.key === 'Enter') commitGoto(); if (e.key === 'Escape') setGotoInput(null); }}
                style={{
                  width: '100%', height: 32, textAlign: 'center', fontSize: 16, fontWeight: 600,
                  border: `1px solid ${t.accent}`, borderRadius: 6, background: t.bgSurface,
                  color: t.text, outline: 'none', boxSizing: 'border-box',
                }} />
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {page} <span style={{ color: t.textMuted, fontWeight: 400 }}>/ {totalPages}</span>
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {start}–{end} из {total.toLocaleString()}
                </div>
              </>
            )}
          </div>
          {showPerPage && (
            <button type="button" onClick={() => setSelectOpen(true)}
              aria-label={`Записей на странице: ${perPage}. Нажмите, чтобы изменить`}
              style={{
                flexShrink: 0, height: 32, minWidth: 60, padding: '0 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.bgSurface, color: t.text, cursor: 'pointer',
              }}>
              {perPage} / стр.
              <IcoChevronDown s={10} />
            </button>
          )}
        </div>
        <button type="button" aria-label="Следующая страница" disabled={page >= totalPages}
          onClick={() => goTo(page + 1)} onPointerDown={press} onPointerUp={unpress} onPointerCancel={unpress}
          style={navBtn(page >= totalPages)}>
          <IcoChevronRight s={16} />
        </button>
      </div>

      {selectOpen && (
        <div onClick={() => setSelectOpen(false)} role="presentation" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Записей на странице"
            style={{
              background: t.bgSurface, borderRadius: '16px 16px 0 0', padding: 8, width: '100%', maxWidth: 480,
              paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
            }}>
            {perPageOptions.map((n) => (
              <button key={n} type="button" onClick={() => { setSelectOpen(false); if (n !== perPage) changePerPage(n); }}
                style={{
                  display: 'block', width: '100%', minHeight: 48, padding: '12px 16px', textAlign: 'center',
                  background: perPage === n ? t.navHoverBg : 'transparent', border: 'none', borderRadius: 10,
                  fontSize: 16, fontWeight: perPage === n ? 600 : 400,
                  color: perPage === n ? t.accent : t.text, cursor: 'pointer',
                }}>
                {n} на странице
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}