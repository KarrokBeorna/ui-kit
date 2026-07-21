import { useState, useEffect, useCallback, useRef } from 'react';
import { Theme } from '../themes/theme';
import { IcoChevronLeft, IcoChevronRight, IcoChevronDown } from './icons';

interface PaginationProps {
  t: Theme;
  total: number;
  /** Начальное значение на страницу (по умолчанию 10) */
  defaultPerPage?: number;
  /** Коллбэк при изменении страницы или perPage */
  onPageChange?: (page: number, perPage: number) => void;
}

export function Pagination({ t, total, defaultPerPage = 10, onPageChange }: PaginationProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  useEffect(() => { setPage(1); }, [total, perPage]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goTo = useCallback((p: number) => {
    const newPage = Math.max(1, Math.min(totalPages, p));
    setPage(newPage);
    onPageChange?.(newPage, perPage);
  }, [totalPages, perPage, onPageChange]);

  useEffect(() => {
    onPageChange?.(page, perPage);
  }, [page, perPage]);

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

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${t.border}`, flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 13, color: t.textMuted, fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>
          Отображены <strong style={{ color: t.text }}>{total === 0 ? 0 : start}–{end}</strong> из <strong style={{ color: t.text }}>{total.toLocaleString()}</strong> строк
        </span>
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setDropOpen(p => !p)}
            style={{ ...btn, padding: '0 10px', gap: 6, color: t.text, background: dropOpen ? t.navHoverBg : t.bgSurface, borderColor: dropOpen ? t.accent : t.border, boxShadow: dropOpen ? `0 0 0 2px ${t.accentGlow}` : 'none' }}
          >
            <span>{perPage} / страницу</span>
            <IcoChevronDown s={11} open={dropOpen} />
          </button>
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '4px', boxShadow: t.shadowLg, opacity: dropOpen ? 1 : 0, transform: dropOpen ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)', pointerEvents: dropOpen ? 'all' : 'none', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', zIndex: 100, minWidth: 100 }}>
            {[10, 50, 100, 500, 1000].map(n => (
              <button key={n} onClick={() => { setPerPage(n); setDropOpen(false); }} style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: perPage === n ? t.navHoverBg : 'transparent', border: 'none', borderRadius: 7, fontSize: 13, fontFamily: 'system-ui', color: perPage === n ? t.accent : t.text, cursor: 'pointer', fontWeight: perPage === n ? 600 : 400, transition: 'background 0.15s' }} onMouseEnter={e => { if (perPage !== n) (e.currentTarget as HTMLButtonElement).style.background = t.navHoverBg; }} onMouseLeave={e => { if (perPage !== n) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                {n} строк
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => goTo(page - 1)} disabled={page === 1} style={{ ...btn, opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }} onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { e.currentTarget.style.background = t.bgSurface; e.currentTarget.style.color = t.textMuted; }}>
          <IcoChevronLeft s={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} style={{ color: t.textMuted, fontSize: 13, padding: '0 4px', userSelect: 'none' }}>…</span>
          ) : (
            <button key={p} onClick={() => goTo(p)} style={{ ...btn, background: page === p ? t.accent : t.bgSurface, color: page === p ? t.accentText : t.textMuted, borderColor: page === p ? 'transparent' : t.border, fontWeight: page === p ? 700 : 500, boxShadow: page === p ? `0 2px 12px ${t.accentGlow}` : 'none' }} onMouseEnter={e => { if (page !== p) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { if (page !== p) { e.currentTarget.style.background = t.bgSurface; e.currentTarget.style.color = t.textMuted; } }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => goTo(page + 1)} disabled={page === totalPages} style={{ ...btn, opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }} onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { e.currentTarget.style.background = t.bgSurface; e.currentTarget.style.color = t.textMuted; }}>
          <IcoChevronRight s={14} />
        </button>
      </div>
    </div>
  );
}