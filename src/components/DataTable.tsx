// DataTable.tsx — блок «таблица + пагинация + оверлей загрузки».
//
// ИЗМЕНЕНИЕ: убран второй (внешний) скролл-контейнер на десктопе. Скроллит
// только внутренний контейнер Table — дробные flex-высоты больше не дают
// паразитную прокрутку в 1–2px по X и Y. На мобильном (карточки) скроллится
// внешняя область, т.к. карточки не имеют фиксированной высоты.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '../themes/theme';
import Table, { useSort, type Column, type SortState, type MobileCardField } from './Table';
import LoadingOverlay from './LoadingOverlay';
import { Pagination, type PaginationProps } from './Pagination';
import { useResponsive } from '../context/AppContext';

/** Нарезка массива на страницы с автосбросом при смене resetKey и сжатии данных. */
export function usePagedData<T>(data: T[], perPage: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const key = resetKey === undefined ? '' : JSON.stringify(resetKey);
  const prevKey = useRef(key);
  useEffect(() => { if (prevKey.current !== key) { prevKey.current = key; setPage(1); } }, [key]);
  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);
  const pageData = useMemo(() => data.slice((page - 1) * perPage, page * perPage), [data, page, perPage]);
  return { page, setPage, pageData, total, totalPages };
}

export interface DataTableProps<T extends Record<string, any>> {
  /** Тема оформления. */
  theme: Theme;
  /** Колонки (можно собрать через ActionsColumn). */
  columns: Column<T>[];
  /** Данные (уже отфильтрованные). */
  data: T[];
  /** Ключ строки. @default 'id' */
  rowKey?: string;
  /** Состояние загрузки — скелетон при пустых данных, оверлей при непустых. */
  loading?: boolean;
  /** Строк на странице. */
  perPage: number;
  /** Колбэк смены размера страницы. */
  onPerPageChange?: (perPage: number) => void;
  /** Ключ персиста колонок таблицы. */
  persistKey?: string;
  /** Всегда видимые колонки в конце (обычно ['actions']). */
  pinnedColumns?: string[];
  /** Прижатые вправо sticky-колонки. */
  stickyRight?: string[];
  /** Начальная сортировка (uncontrolled). */
  initialSort?: SortState;
  /** Controlled-сортировка. */
  sortState?: SortState;
  /** Колбэк сортировки. */
  onSortChange?: (s: SortState) => void;
  /** Смена значения сбрасывает страницу на 1 (например объект фильтров). */
  resetKey?: unknown;
  /** Максимальная ширина ячейки, px. @default 300 */
  columnMaxWidth?: number;
  /** Заголовок мобильной карточки. */
  mobileTitleRender?: (row: T) => React.ReactNode;
  /** Ширина колонки меток в мобильной карточке. */
  mobileLabelMaxWidth?: number;
  /** Явные поля мобильной карточки. */
  mobileFields?: MobileCardField<T>[];
  /** Действия в мобильной карточке. */
  mobileActions?: (row: T) => React.ReactNode;
  /** Клик по строке. */
  onRowClick?: (row: T) => void;
  /** Стиль строки. */
  rowStyle?: (row: T) => React.CSSProperties;
  /** Ключ выделенной строки. */
  selectedRowKey?: string | number;
  /** Автообновление. */
  refetch?: () => void | Promise<void>;
  /** Интервал автообновления, мс. */
  autoRefreshInterval?: number;
  /** Пауза автообновления. */
  autoRefreshPaused?: boolean;
  /** Проброс пропсов в Pagination. */
  pagination?: Partial<PaginationProps>;
}

/** Таблица со сортировкой, пагинацией и оверлеем загрузки в едином flex-блоке. */
export default function DataTable<T extends Record<string, any>>({
  theme: t, columns, data, rowKey = 'id', loading = false, perPage, onPerPageChange,
  persistKey, pinnedColumns, stickyRight, initialSort, sortState: extSort, onSortChange,
  resetKey, columnMaxWidth = 300, mobileTitleRender, mobileLabelMaxWidth, mobileFields, mobileActions,
  onRowClick, rowStyle, selectedRowKey, refetch, autoRefreshInterval, autoRefreshPaused, pagination,
}: DataTableProps<T>) {
  const { isMobile } = useResponsive();
  const inner = useSort(data, initialSort ?? []);
  const sortState = extSort ?? inner.sortState;
  const sorted = extSort ? data : inner.sortedData;
  const { page, setPage, pageData, total } = usePagedData(sorted, perPage, resetKey);

  const changeSort = (s: SortState) => { setPage(1); (onSortChange ?? inner.setSortState)(s); };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }}>
      <div style={{
        flex: 1, minHeight: 0, position: 'relative', boxSizing: 'border-box',
        overflow: isMobile ? 'auto' : 'hidden', overscrollBehavior: 'contain',
      }}>
        <Table
          theme={t} columns={columns} data={pageData} rowKey={rowKey}
          fixedHeader height="100%" columnMaxWidth={columnMaxWidth}
          persistKey={persistKey} pinnedColumns={pinnedColumns} stickyRight={stickyRight}
          sortState={sortState} onSortChange={changeSort} sortable={false}
          loading={loading && pageData.length === 0}
          mobileTitleRender={mobileTitleRender} mobileLabelMaxWidth={mobileLabelMaxWidth}
          mobileFields={mobileFields} mobileActions={mobileActions}
          onRowClick={onRowClick} rowStyle={rowStyle} selectedRowKey={selectedRowKey}
          refetch={refetch} autoRefreshInterval={autoRefreshInterval} autoRefreshPaused={autoRefreshPaused}
        />
        <LoadingOverlay visible={loading && pageData.length > 0} theme={t} />
      </div>
      <Pagination
        t={t} total={total} page={page} defaultPerPage={perPage}
        onPageChange={(p, pp) => { setPage(p); if (pp !== perPage) onPerPageChange?.(pp); }}
        {...pagination}
      />
    </div>
  );
}