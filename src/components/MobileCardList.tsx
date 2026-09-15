import React, { Fragment } from 'react';
import type { Theme } from '../themes/theme';

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
  /** Заголовок карточки, например «Ноутбук Dell» */
  titleRender?: (row: T) => React.ReactNode;
  /** Действие по кнопке «Редактировать» */
  onEdit?: (row: T) => void;
  /** Клик по карточке */
  onRowClick?: (row: T) => void;
  /** Дополнительные кнопки рядом с «Редактировать» */
  actions?: (row: T) => React.ReactNode;
  emptyText?: string;
}

/**
 * Карточный список для мобильных экранов.
 * Используется вместо Table, когда useResponsive().isMobile === true.
 */
export function MobileCardList<T extends Record<string, any>>({
  t,
  data,
  rowKey,
  fields,
  titleRender,
  onEdit,
  onRowClick,
  actions,
  emptyText = 'Нет данных',
}: MobileCardListProps<T>) {
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
  const hasFooter = !!(onEdit || actions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((row) => {
        const clickable = !!onRowClick;
        return (
          <div
            key={String(row[rowKey])}
            onClick={clickable ? () => onRowClick!(row) : undefined}
            style={{
              background: t.bgSurface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 14,
              color: t.text,
              cursor: clickable ? 'pointer' : 'default',
              boxShadow: t.shadow,
              transition: 'box-shadow 0.15s',
            }}
          >
            {titleRender && (
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 10,
                  color: t.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {titleRender(row)}
              </div>
            )}

            <dl
              style={{
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, auto) minmax(0, 1fr)',
                gap: '6px 12px',
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {visibleFields.map((f) => (
                <Fragment key={f.label}>
                  <dt
                    style={{
                      color: t.textMuted,
                      whiteSpace: 'nowrap',
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
                    }}
                  >
                    {f.render(row)}
                  </dd>
                </Fragment>
              ))}
            </dl>

            {hasFooter && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {actions?.(row)}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                    }}
                    style={{
                      flex: actions ? '0 0 auto' : '1 1 auto',
                      minHeight: 44,
                      padding: '10px 18px',
                      background: t.accent,
                      color: t.accentText,
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Редактировать
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}