import type { Theme } from '../themes/theme';
import { IcoChevronLeft, IcoChevronRight } from './icons';

export interface MobilePaginationProps {
  t: Theme;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number, perPage: number) => void;
  /**
   * Прижать пагинацию к низу scroll-контейнера.
   * @default true
   */
  sticky?: boolean;
  /**
   * Отступ снизу от края, px (учитывает safe-area).
   * @default 8
   */
  stickyOffset?: number;
}

export function MobilePagination({
  t,
  page,
  perPage,
  total,
  onPageChange,
  sticky = true,
  stickyOffset = 8,
}: MobilePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const btn = (disabled: boolean): React.CSSProperties => ({
    minWidth: 44,
    minHeight: 44,
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
  });

  return (
    <div
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
        justifyContent: 'space-between',
        gap: 8,
        padding: 12,
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        color: t.text,
        fontSize: 13,
        boxShadow: sticky ? t.shadowLg : undefined,
      }}
    >
      <button
        type="button"
        aria-label="Предыдущая страница"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1, perPage)}
        style={btn(page <= 1)}
      >
        <IcoChevronLeft s={16} />
      </button>

      <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          {page} / {pages}
        </div>
        <div style={{ fontSize: 11, color: t.textMuted }}>
          {start}–{end} из {total.toLocaleString()}
        </div>
      </div>

      <button
        type="button"
        aria-label="Следующая страница"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1, perPage)}
        style={btn(page >= pages)}
      >
        <IcoChevronRight s={16} />
      </button>
    </div>
  );
}