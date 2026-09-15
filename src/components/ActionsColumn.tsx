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

  /** Отступ между кнопками, px. Если не задан — 6 на десктопе, 8 на мобиле. */
  gap?: number;

  /** Дополнительные кнопки справа от стандартных. */
  extraActions?: (row: T) => React.ReactNode;

  /** Сортировка. По умолчанию false. */
  sortable?: boolean;

  /**
   * Мобильный режим. Определяет размер кнопок (sm → md).
   *
   * ⚠️ ВАЖНО: если вызываете ActionsColumn внутри useMemo/useCallback,
   * ОБЯЗАТЕЛЬНО передавайте этот проп явно из useResponsive() в вашем
   * компоненте. Если не передать — значение будет прочитано через
   * window.matchMedia синхронно, но без подписки на изменение ширины.
   *
   * ActionsColumn — не хук, поэтому НЕ вызывайте её через useResponsive
   * внутри неё. Это ломает правила хуков.
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
 *
 * Пример:
 *   const { isMobile } = useResponsive();
 *
 *   const columns = useMemo(() => [
 *     ...,
 *     ActionsColumn<ScanRecord>({
 *       theme: t,
 *       onEdit: handleEdit,
 *       onDelete: handleDelete,
 *       isMobile,
 *     }),
 *   ], [t, handleEdit, handleDelete, isMobile]);
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
    extraActions,
    sortable = false,
    buttonSize,
  } = options;

  // Определяем мобильный режим БЕЗ хуков.
  // Явный проп в приоритете; иначе синхронное чтение matchMedia (SSR-safe).
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

      const nothingToShow = !onEdit && !onLog && !onDelete && !extraActions;
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