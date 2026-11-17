import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../themes/theme';
import { IcoChevronLeft, IcoChevronRight, IcoChevronDown } from '../icons';
import { useResponsive } from '../../context/ResponsiveContext';
import { MobilePagination } from './MobilePagination';

interface PaginationProps {
  t: Theme;
  total: number;
  defaultPerPage?: number;
  page?: number;
  onPageChange?: (page: number, perPage: number) => void;
}

/**
 * Пагинация для десктопа.
 *
 * Controlled-режим (`page` передан): источник истины — родитель.
 * Все клики идут через `onPageChange`, никакого локального «второго» state.
 *
 * Uncontrolled (`page` не передан): локальный `internalPage` + нотификация
 * через `onPageChange` (родитель может логировать).
 */
export function Pagination({
  t,
  total,
  defaultPerPage = 10,
  page: externalPage,
  onPageChange,
}: PaginationProps) {
  const [internalPage, setInternalPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [dropOpen, setDropOpen] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, openUp: true });

  const { isMobile } = useResponsive();

  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const page = externalPage !== undefined ? externalPage : internalPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Родитель может изменить defaultPerPage снаружи — синхронизируем внутренний state.
  useEffect(() => {
    setPerPage(defaultPerPage);
  }, [defaultPerPage]);

  // Если total уменьшился — в uncontrolled-режиме подрезаем internalPage,
  // чтобы не показывать пустую страницу.
  useEffect(() => {
    if (externalPage === undefined) {
      setInternalPage((p) => Math.min(p, totalPages));
    }
  }, [totalPages, externalPage]);

  // Клик вне дропдауна
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  // Позиция дропдауна
  useEffect(() => {
    if (!dropOpen || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceAbove >= 220 || spaceAbove > spaceBelow;
    setDropPos({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      openUp,
    });
  }, [dropOpen]);

  // ── Переход на страницу ──
  const goTo = useCallback(
    (p: number) => {
      const newPage = Math.max(1, Math.min(totalPages, p));
      if (externalPage === undefined) setInternalPage(newPage);
      onPageChangeRef.current?.(newPage, perPage);
    },
    [totalPages, externalPage, perPage],
  );

  // ── Смена perPage: страница сбрасывается на 1 ──
  const changePerPage = useCallback(
    (n: number) => {
      setPerPage(n);
      if (externalPage === undefined) setInternalPage(1);
      setDropOpen(false);
      onPageChangeRef.current?.(1, n);
    },
    [externalPage],
  );

  // ── Мобильный режим ──
  if (isMobile) {
    return (
      <MobilePagination
        t={t}
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={(p, pp) => {
          if (externalPage === undefined) setInternalPage(p);
          if (pp !== perPage) setPerPage(pp);
          onPageChangeRef.current?.(p, pp);
        }}
      />
    );
  }

  // ── Список страниц ──
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
    height: 34,
    padding: '0 6px',
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.bgSurface,
    color: t.textMuted,
    fontSize: 13,
    fontFamily: 'system-ui',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    fontWeight: 500,
  };

  const dropdown = dropOpen
    ? createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            minWidth: 120,
            background: t.bgSurface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: 4,
            boxShadow: t.shadowLg,
            zIndex: 1000,
            transform: dropPos.openUp ? 'translateY(-100%)' : 'none',
            transformOrigin: dropPos.openUp ? 'bottom left' : 'top left',
          }}
        >
          {[10, 50, 100, 500, 1000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => changePerPage(n)}
              style={{
                display: 'block',
                width: '100%',
                padding: '7px 12px',
                textAlign: 'left',
                background: perPage === n ? t.navHoverBg : 'transparent',
                border: 'none',
                borderRadius: 7,
                fontSize: 13,
                fontFamily: 'system-ui',
                color: perPage === n ? t.accent : t.text,
                cursor: 'pointer',
                fontWeight: perPage === n ? 600 : 400,
                transition: 'background 0.15s',
              }}
            >
              {n} строк
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderTop: `1px solid ${t.border}`,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            fontSize: 13,
            color: t.textMuted,
            fontFamily: 'system-ui',
            whiteSpace: 'nowrap',
          }}
        >
          Отображены <strong style={{ color: t.text }}>{start}–{end}</strong> из{' '}
          <strong style={{ color: t.text }}>{total.toLocaleString()}</strong> строк
        </span>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setDropOpen((p) => !p)}
          style={{
            ...btn,
            padding: '0 10px',
            gap: 6,
            color: t.text,
            background: dropOpen ? t.navHoverBg : t.bgSurface,
            borderColor: dropOpen ? t.accent : t.border,
            boxShadow: dropOpen ? `0 0 0 2px ${t.accentGlow}` : 'none',
          }}
        >
          <span>{perPage} / страницу</span>
          <IcoChevronDown s={11} open={dropOpen} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          style={{
            ...btn,
            opacity: page === 1 ? 0.35 : 1,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <IcoChevronLeft s={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span
              key={`e${i}`}
              style={{ color: t.textMuted, fontSize: 13, padding: '0 4px', userSelect: 'none' }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              style={{
                ...btn,
                background: page === p ? t.accent : t.bgSurface,
                color: page === p ? t.accentText : t.textMuted,
                borderColor: page === p ? 'transparent' : t.border,
                fontWeight: page === p ? 700 : 500,
                boxShadow: page === p ? `0 2px 12px ${t.accentGlow}` : 'none',
              }}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          style={{
            ...btn,
            opacity: page === totalPages ? 0.35 : 1,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <IcoChevronRight s={14} />
        </button>
      </div>

      {dropdown}
    </div>
  );
}