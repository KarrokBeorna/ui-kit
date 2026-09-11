import React from 'react';
import { Theme } from '../themes/theme';
import Button from './Button';

export interface ActionsColumnOptions<T> {
  /** Тема из @kbs/ui-kit. Обязательна. */
  theme: Theme;

  /** Показать «редактировать». Если не передан — кнопки нет. */
  onEdit?: (row: T) => void;

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
  deleteIcon?: React.ReactNode;
  restoreIcon?: React.ReactNode;
  logIcon?: React.ReactNode;

  /** Отступ между кнопками, px. По умолчанию 6. */
  gap?: number;

  /** Дополнительные кнопки справа от стандартных. */
  extraActions?: (row: T) => React.ReactNode;

  /** Сортировка. По умолчанию false. */
  sortable?: boolean;
}

/**
 * Фабрика стандартной колонки «Действия».
 *
 * Использование:
 *   const columns = useMemo(() => [
 *     ...,
 *     createActionsColumn<ScanRecord>({
 *       theme: t,
 *       onEdit: handleEdit,
 *       onLog: handleEdit,
 *       onDelete: handleDelete,
 *       onRestore: handleRestore,
 *     }),
 *   ], [t, handleEdit, handleDelete, handleRestore]);
 */
export function ActionsColumn<T>(options: ActionsColumnOptions<T>) {
  const {
    theme,
    onEdit,
    onLog,
    onDelete,
    onRestore,
    isDeleted = (row: any) => row?.is_deleted === true,
    key = 'actions',
    header = 'Действия',
    editIcon = '✎',
    logIcon = '⌸',
    deleteIcon = '✕',
    restoreIcon = '⟳',
    gap = 6,
    extraActions,
    sortable = false,
  } = options;

  return {
    key,
    header,
    sortable,
    render: (_: unknown, row: T): React.ReactNode => {
      if (isDeleted(row)) {
        // Режим восстановления
        if (!onRestore && !extraActions) return null;
        return (
          <div style={{ display: 'flex', gap, alignItems: 'center' }}>
            {onRestore && (
              <Button
                icon={restoreIcon}
                variant="primary"
                outline
                size="sm"
                onClick={() => onRestore(row)}
                theme={theme}
              />
            )}
            {extraActions?.(row)}
          </div>
        );
      }

      // Обычный режим
      const nothingToShow = !onEdit && !onDelete && !extraActions;
      if (nothingToShow) return null;

      return (
        <div style={{ display: 'flex', gap, alignItems: 'center' }}>
          {onEdit && (
            <Button
              icon={editIcon}
              variant="primary"
              outline
              size="sm"
              onClick={() => onEdit(row)}
              theme={theme}
            />
          )}
          {onLog && (
            <Button
              icon={logIcon}
              variant="primary"
              outline
              size="sm"
              onClick={() => onLog(row)}
              theme={theme}
            />
          )}
          {onDelete && (
            <Button
              icon={deleteIcon}
              variant="danger"
              outline
              size="sm"
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