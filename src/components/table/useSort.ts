import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortState = { key: string; direction: SortDirection }[];

function compareValues(a: unknown, b: unknown): number {
  // numeric: true — «item10» > «item2», а не наоборот.
  // sensitivity: 'base' — «Иванов» = «иванов».
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortCustom<T extends Record<string, any>>(data: T[], sortState: SortState): T[] {
  if (sortState.length === 0) return data;
  const sorted = [...data];
  sorted.sort((a, b) => {
    for (const { key, direction } of sortState) {
      const aVal = a[key];
      const bVal = b[key];

      const aEmpty = aVal === null || aVal === undefined || aVal === '';
      const bEmpty = bVal === null || bVal === undefined || bVal === '';

      if (aEmpty && bEmpty) continue;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      const cmp = compareValues(aVal, bVal);
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

/**
 * Многоуровневая сортировка для массивов объектов.
 * Совместима с `sortState` из `<Table>`.
 *
 * Возвращает:
 *  - sortedData — отсортированный массив (копия);
 *  - sortState — текущее состояние;
 *  - setSortState — сеттер (принимает массив вида [{ key, direction }]).
 */
export function useSort<T extends Record<string, any>>(
  data: T[],
  initialSort: SortState = [],
) {
  const [sortState, setSortState] = useState<SortState>(initialSort);

  const sortedData = useMemo(() => {
    if (sortState.length === 0) return data;
    return sortCustom(data, sortState);
  }, [data, sortState]);

  return { sortedData, sortState, setSortState };
}