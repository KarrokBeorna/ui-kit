// DataTable.tsx — блок «таблица + пагинация + оверлей загрузки».
//
// ИЗМЕНЕНИЕ: при первом запросе (loading=true, данных нет) не рендерим Table
// вообще — только LoadingOverlay с текстом «Загрузка…». Иначе <td> с этим
// текстом внутри таблицы перекрывал оверлей (zIndex контента > zIndex оверлея).

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
  /** Состояние загрузки. */
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

  // Первый запрос: данных нет, идёт загрузка → показываем только оверлей, без таблицы.
  // Иначе <td>«Загрузка…» внутри таблицы перекрывает LoadingOverlay.
  const isFirstLoad = loading && sorted.length === 0;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }}>
      <div style={{
        flex: 1, minHeight: 0, position: 'relative', boxSizing: 'border-box',
        overflow: isMobile ? 'auto' : 'hidden', overscrollBehavior: 'contain',
      }}>
        {/* Таблица рендерится только если есть данные ИЛИ загрузка закончилась */}
        {(!isFirstLoad || !loading) && (
          <Table
            theme={t} columns={columns} data={pageData} rowKey={rowKey}
            fixedHeader height="100%" columnMaxWidth={columnMaxWidth}
            persistKey={persistKey} pinnedColumns={pinnedColumns} stickyRight={stickyRight}
            sortState={sortState} onSortChange={changeSort} sortable={false}
            loading={false}
            mobileTitleRender={mobileTitleRender} mobileLabelMaxWidth={mobileLabelMaxWidth}
            mobileFields={mobileFields} mobileActions={mobileActions}
            onRowClick={onRowClick} rowStyle={rowStyle} selectedRowKey={selectedRowKey}
            refetch={refetch} autoRefreshInterval={autoRefreshInterval} autoRefreshPaused={autoRefreshPaused}
          />
        )}
        {/* Оверлей показываем всегда при loading, независимо от наличия данных */}
        <LoadingOverlay visible={loading} theme={t} />
      </div>
      <Pagination
        t={t} total={total} page={page} defaultPerPage={perPage}
        onPageChange={(p, pp) => { setPage(p); if (pp !== perPage) onPerPageChange?.(pp); }}
        {...pagination}
      />
    </div>
  );
}