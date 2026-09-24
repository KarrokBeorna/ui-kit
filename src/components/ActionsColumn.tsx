import React from 'react';
import { Theme } from '../themes/theme';
import Button from './inputs/Button';

export interface ActionsColumnOptions<T> {
  /** Тема из @kbs/ui-kit. Обязательна. */
  theme: Theme;

  /** Показать «редактировать». Если не передан — кнопки нет. */
  onEdit?: (row: T) => void;

  /** Показать «скачать». Если не передан — кнопки нет. */
  onDownload?: (row: T) => void;

  /** Показать «логи». Если не передан — кнопки нет. */
  onLog?: (row: T) => void;

  /** Показать «удалить». Если не передан — кнопки нет. */
  onDelete?: (row: T) => void;

  /** Показать «восстановить» для удалённых. Если не передан — ничего не рендерим. */
  onRestore?: (row: T) => void;

  /**
   * Как понять, что строка удалена → режим «restore».
   * По умолчанию — `row.is_deleted === true`.
   * Переопределите, если у вашей сущности другое поле.
   */
  isDeleted?: (row: T) => boolean;

  /** Ключ колонки. По умолчанию `'actions'`. */
  key?: string;
  /** Заголовок. По умолчанию `'Действия'`. */
  header?: string;

  /** Иконки. */
  editIcon?: React.ReactNode;
  downloadIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  restoreIcon?: React.ReactNode;
  logIcon?: React.ReactNode;

  /** Отступ между кнопками, px. Если не задан — 6 на десктопе, 8 на мобиле. */
  gap?: number;

  /** Дополнительные кнопки справа от стандартных. */
  extraActions?: (row: T) => React.ReactNode;

  sortable?: boolean;

  /**
   * Мобильный режим. Определяет размер кнопок (sm → md).
   * Передавайте явно из useResponsive() при использовании в useMemo.
   */
  isMobile?: boolean;

  /**
   * Принудительно размер кнопок. Если не задан — определяется
   * по isMobile (sm на десктопе, md на мобиле).
   */
  buttonSize?: 'sm' | 'md';
}

/**
 * Фабрика стандартной колонки «Действия».
 *
 * ⚠️ Это НЕ хук. Хуки внутри неё не вызываются.
 * Если нужен адаптив — передайте `isMobile` явно.
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
    buttonSize,
  } = options;

  const isMobile =
    options.isMobile ??
    (typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 640px)').matches
      : false);

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
            <Button
              icon={editIcon}
              variant="primary"
              outline
              size={size}
              onClick={() => onEdit(row)}
              theme={theme}
            />
          )}
          {onDownload && (
            <Button
              icon={downloadIcon}
              variant="primary"
              outline
              size={size}
              onClick={() => onDownload(row)}
              theme={theme}
            />
          )}
          {onLog && (
            <Button
              icon={logIcon}
              variant="primary"
              outline
              size={size}
              onClick={() => onLog(row)}
              theme={theme}
            />
          )}
          {onDelete && (
            <Button
              icon={deleteIcon}
              variant="danger"
              outline
              size={size}
              onClick={() => onDelete(row)}
              theme={theme}
            />
          )}
          {extraActions?.(row)}
        </div>
      );
    },
  };
}