import React from 'react';
import { Theme } from '../../themes/theme';
import Button from '../inputs/Button';

export interface ActionsColumnOptions<T> {
  theme: Theme;
  onEdit?: (row: T) => void;
  onDownload?: (row: T) => void;
  onLog?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRestore?: (row: T) => void;
  isDeleted?: (row: T) => boolean;
  key?: string;
  header?: string;
  editIcon?: React.ReactNode;
  downloadIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  restoreIcon?: React.ReactNode;
  logIcon?: React.ReactNode;
  gap?: number;
  extraActions?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Передавайте явно из `useResponsive()`. Без фолбэка на matchMedia. */
  isMobile?: boolean;
  buttonSize?: 'sm' | 'md';
}

/**
 * Фабрика колонки «Действия».
 *
 * ⚠️ НЕ хук. `isMobile` передавайте пропом из `useResponsive()` (не используйте
 * `window.matchMedia` внутри — он вычисляется один раз и устаревает при
 * resize/повороте).
 *
 * Иконки по умолчанию — текстовые. Для консистентного вида (особенно на
 * мобиле) переопределите SVG-иконками из `@kbs/ui-kit/icons`.
 */
export function ActionsColumn<T>(options: ActionsColumnOptions<T>) {
  const {
    theme,
    onEdit,
    onDownload,
    onLog,
    onDelete,
    onRestore,
    isDeleted = (row: any) => row?.is_deleted === true,
    key = 'actions',
    header = 'Действия',
    editIcon = '✎',
    downloadIcon = '⬇',
    logIcon = '⌸',
    deleteIcon = '✕',
    restoreIcon = '⟳',
    extraActions,
    sortable = false,
    isMobile = false,
    buttonSize,
  } = options;

  const gap = options.gap ?? (isMobile ? 8 : 6);
  const size = buttonSize ?? (isMobile ? 'md' : 'sm');

  return {
    key,
    header,
    sortable,
    render: (_: unknown, row: T): React.ReactNode => {
      if (isDeleted(row)) {
        if (!onRestore && !extraActions) return null;
        return (
          <div style={{ display: 'flex', gap, alignItems: 'center' }}>
            {onRestore && (
              <Button
                icon={restoreIcon}
                variant="primary"
                outline
                size={size}
                onClick={() => onRestore(row)}
                theme={theme}
              />
            )}
            {extraActions?.(row)}
          </div>
        );
      }

      const nothingToShow = !onEdit && !onDownload && !onLog && !onDelete && !extraActions;
      if (nothingToShow) return null;

      return (
        <div style={{ display: 'flex', gap, alignItems: 'center' }}>
          {onEdit && (
            <Button icon={editIcon} variant="primary" outline size={size} onClick={() => onEdit(row)} theme={theme} />
          )}
          {onDownload && (
            <Button icon={downloadIcon} variant="primary" outline size={size} onClick={() => onDownload(row)} theme={theme} />
          )}
          {onLog && (
            <Button icon={logIcon} variant="primary" outline size={size} onClick={() => onLog(row)} theme={theme} />
          )}
          {onDelete && (
            <Button icon={deleteIcon} variant="danger" outline size={size} onClick={() => onDelete(row)} theme={theme} />
          )}
          {extraActions?.(row)}
        </div>
      );
    },
  };
}