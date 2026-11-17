import React, { Fragment, useState, useRef, useEffect } from 'react';
import type { Theme } from '../../themes/theme';
import { useAutoRefresh } from './useAutoRefresh';

export interface MobileCardField<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  hidden?: boolean;
}

export interface MobileCardListProps<T> {
  t: Theme;
  data: T[];
  rowKey: keyof T;
  fields: MobileCardField<T>[];

  /** Заголовок карточки. См. `titleMaxLines`, `titleMaxChars`. */
  titleRender?: (row: T) => React.ReactNode;
  /** Максимум строк заголовка (line-clamp). @default 2 */
  titleMaxLines?: number;
  /** Максимум символов заголовка (посимвольно, с «…»). */
  titleMaxChars?: number;

  onRowClick?: (row: T) => void;

  /** Иконки-действия в футере карточки (например, из ActionsColumn). */
  actions?: (row: T) => React.ReactNode;

  emptyText?: string;
  rowStyle?: (row: T) => React.CSSProperties;
  rowClassName?: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  gap?: number;

  /**
   * Максимальная ширина колонки меток (`dt`), px.
   * Все метки выравниваются в одну колонку, но не шире `labelMaxWidth`.
   * Если метка не влезает — переносится на новую строку.
   *
   * ⚠️ Для чистого переноса по словам (`«Последний»` / `«вход»`)
   * значение должно быть не меньше ширины самого длинного слова
   * (≈70px для «Последний»). Меньше — слова будут рваться посередине.
   * @default 160
   */
  labelMaxWidth?: number;

  /**
   * Максимум строк метки. `undefined` — без ограничения.
   * Если задано — лишнее обрезается «…» через line-clamp.
   * @default undefined
   */
  labelMaxLines?: number;

  autoRefreshInterval?: number;
  autoRefreshPaused?: boolean;
  refetch?: () => void | Promise<void>;
}

export function MobileCardList<T extends Record<string, any>>({
  t,
  data,
  rowKey,
  fields,
  titleRender,
  titleMaxLines = 2,
  titleMaxChars,
  onRowClick,
  actions,
  emptyText = 'Нет данных',
  rowStyle,
  rowClassName,
  loading = false,
  pageSize = 20,
  gap = 10,
  labelMaxWidth = 160,
  labelMaxLines,
  autoRefreshInterval,
  autoRefreshPaused = false,
  refetch,
}: MobileCardListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useAutoRefresh(refetch ?? (() => {}), {
    intervalMs: autoRefreshInterval ?? 30_000,
    paused: autoRefreshPaused || !refetch || autoRefreshInterval === undefined,
  });

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [data, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, data.length));
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data.length, pageSize]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: t.bgSurface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ height: 16, width: '60%', background: t.border, borderRadius: 4, marginBottom: 10 }} />
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                style={{
                  height: 12,
                  background: t.borderSubtle,
                  borderRadius: 4,
                  marginBottom: 6,
                  width: `${70 + k * 10}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: t.placeholder,
          background: t.bgSurface,
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          fontSize: 14,
        }}
      >
        {emptyText}
      </div>
    );
  }

  const visibleFields = fields.filter((f) => !f.hidden);
  const hasActions = !!actions;
  const hasMore = visibleCount < data.length;
  const slice = data.slice(0, visibleCount);

  const renderTitle = (row: T): React.ReactNode => {
    if (!titleRender) return null;
    const raw = titleRender(row);
    if (titleMaxChars && typeof raw === 'string' && raw.length > titleMaxChars) {
      return raw.slice(0, titleMaxChars - 1) + '…';
    }
    return raw;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {slice.map((row) => {
        const clickable = !!onRowClick;
        const customStyle = rowStyle ? rowStyle(row) : {};
        const className = rowClassName ? rowClassName(row) : '';
        return (
          <div
            key={String(row[rowKey])}
            className={className}
            onClick={clickable ? () => onRowClick!(row) : undefined}
            onTouchStart={(e) => {
              if (clickable) e.currentTarget.style.opacity = '0.85';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onTouchCancel={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            style={{
              background: t.bgSurface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 14,
              color: t.text,
              cursor: clickable ? 'pointer' : 'default',
              boxShadow: t.shadow,
              transition: 'opacity 0.15s, box-shadow 0.15s',
              ...customStyle,
            }}
          >
            {titleRender && (
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 10,
                  color: t.text,
                  display: '-webkit-box',
                  WebkitLineClamp: titleMaxLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {renderTitle(row)}
              </div>
            )}

            <dl
              style={{
                margin: 0,
                display: 'grid',
                gridTemplateColumns: `minmax(0, ${labelMaxWidth}px) minmax(0, 1fr)`,
                gap: '6px 12px',
                fontSize: 13,
                lineHeight: 1.45,
                alignItems: 'start', // ← чтобы многострочный dt не растягивал dd
              }}
            >
              {visibleFields.map((f) => (
                <Fragment key={f.label}>
                  <dt
                    style={{
                      color: t.textMuted,
                      whiteSpace: 'normal',        // ← разрешаем перенос
                      overflowWrap: 'break-word',  // ← ломаем длинные слова
                      wordBreak: 'normal',         // ← по умолчанию — по словам
                      ...(labelMaxLines != null && {
                        display: '-webkit-box',
                        WebkitLineClamp: labelMaxLines,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }),
                    }}
                  >
                    {f.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: t.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.render(row)}
                  </dd>
                </Fragment>
              ))}
            </dl>

            {hasActions && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 6,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {actions!(row)}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.min(c + pageSize, data.length))}
          style={{
            minHeight: 44,
            padding: '10px 18px',
            background: 'transparent',
            border: `1px dashed ${t.border}`,
            borderRadius: 10,
            color: t.textMuted,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Показать ещё ({data.length - visibleCount})
        </button>
      )}
    </div>
  );
}