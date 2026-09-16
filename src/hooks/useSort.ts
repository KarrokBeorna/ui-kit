import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortState = { key: string; direction: SortDirection }[];

function sortCustom<T extends Record<string, any>>(
  data: T[],
  sortState: SortState
): T[] {
  if (sortState.length === 0) return data;
  const sorted = [...data];
  sorted.sort((a, b) => {
    for (const { key, direction } of sortState) {
      const aVal = a[key];
      const bVal = b[key];

      const aIsNull = aVal === null || aVal === undefined;
      const bIsNull = bVal === null || bVal === undefined;

      if (aIsNull && bIsNull) continue;
      if (aIsNull) return 1;
      if (bIsNull) return -1;

      if (aVal === bVal) continue;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
        continue;
      }

      const cmp = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

/**
 * Многоуровневая сортировка для массивов объектов.
 * Совместима с sortState из `<Table>`.
 *
 * Возвращает:
 *  - sortedData — отсортированный массив (копия);
 *  - sortState — текущее состояние;
 *  - setSortState — сеттер (принимает массив вида [{ key, direction }]).
 */
export function useSort<T extends Record<string, any>>(data: T[]) {
  const [sortState, setSortState] = useState<SortState>([]);

  const sortedData = useMemo(() => {
    if (sortState.length === 0) return data;
    return sortCustom(data, sortState);
  }, [data, sortState]);

  return { sortedData, sortState, setSortState };
}