import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_PREFIX = 'table-columns:';
const hasStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

interface Stored {
  order: string[];
  visible: string[];
}

function load(key: string): Stored | null {
  if (!hasStorage) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.order) && Array.isArray(parsed?.visible)) {
      return {
        order: Array.from(new Set<string>(parsed.order)),
        visible: Array.from(new Set<string>(parsed.visible)),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function save(key: string, value: Stored): void {
  if (!hasStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function remove(key: string): void {
  if (!hasStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function reconcileOrder(stored: string[], allKeys: string[]): string[] {
  const allSet = new Set(allKeys);
  const result = stored.filter((k) => allSet.has(k));
  for (const k of allKeys) if (!result.includes(k)) result.push(k);
  return result;
}

function reconcileVisible(
  storedVisible: string[],
  storedOrder: string[],
  allKeys: string[],
): string[] {
  const allSet = new Set(allKeys);
  const storedOrderSet = new Set(storedOrder);
  const result = storedVisible.filter((k) => allSet.has(k));
  for (const k of allKeys) {
    if (!storedOrderSet.has(k) && !result.includes(k)) result.push(k);
  }
  return result;
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface UsePersistedTableColumnsOptions {
  /**
   * Всегда видимые колонки в конце, не персистятся (например, `'actions'`).
   */
  pinnedKeys?: string[];
  /**
   * Если `false` — не читает и не пишет localStorage (возвращает дефолты).
   * Позволяет вызывать хук безусловно (rules of hooks), но не засорять storage
   * при `persistKey=undefined` в `<Table>`.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Управление порядком/видимостью колонок `<Table>` с персистом в localStorage
 * под ключом `table-columns:<tableKey>`.
 */
export function usePersistedTableColumns(
  tableKey: string,
  allColumnKeys: string[],
  options: UsePersistedTableColumnsOptions = {},
) {
  const storageKey = STORAGE_PREFIX + tableKey;
  const enabled = options.enabled !== false;

  const pinnedSignature = (options.pinnedKeys ?? []).join('\u0001');
  const pinnedKeys = useMemo(
    () => options.pinnedKeys ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedSignature],
  );
  const pinnedSet = useMemo(() => new Set(pinnedKeys), [pinnedKeys]);

  const persistableKeys = useMemo(
    () => allColumnKeys.filter((k) => !pinnedSet.has(k)),
    [allColumnKeys, pinnedSet],
  );
  const signature = persistableKeys.join('\u0001');

  const [order, setOrder] = useState<string[]>(() => {
    if (!enabled) return persistableKeys;
    const s = load(storageKey);
    return s ? reconcileOrder(s.order, persistableKeys) : persistableKeys;
  });

  const [visible, setVisible] = useState<string[]>(() => {
    if (!enabled) return persistableKeys;
    const s = load(storageKey);
    if (!s) return persistableKeys;
    return reconcileVisible(s.visible, s.order, persistableKeys);
  });

  const prevKeysRef = useRef<string[]>(persistableKeys);
  const allKeysRef = useRef<string[]>(persistableKeys);
  allKeysRef.current = persistableKeys;

  useEffect(() => {
    const prevKeys = prevKeysRef.current;
    const current = allKeysRef.current;

    const prevSet = new Set(prevKeys);
    const currentSet = new Set(current);
    const addedKeys = current.filter((k) => !prevSet.has(k));
    const removedKeys = prevKeys.filter((k) => !currentSet.has(k));

    if (addedKeys.length > 0 || removedKeys.length > 0) {
      setOrder((prev) => {
        const next = reconcileOrder(prev, current);
        return same(prev, next) ? prev : next;
      });
      setVisible((prev) => {
        const next = prev.filter((k) => currentSet.has(k));
        for (const k of addedKeys) if (!next.includes(k)) next.push(k);
        return same(prev, next) ? prev : next;
      });
    }
    prevKeysRef.current = current;
  }, [signature]);

  useEffect(() => {
    if (!enabled) return;
    save(storageKey, { order, visible });
  }, [storageKey, order, visible, enabled]);

  const onApplySettings = useCallback(
    (v: string[], o: string[]) => {
      setVisible(v.filter((k) => !pinnedSet.has(k)));
      setOrder(o.filter((k) => !pinnedSet.has(k)));
    },
    [pinnedSet],
  );

  const reset = useCallback(() => {
    setOrder(allKeysRef.current);
    setVisible(allKeysRef.current);
    if (enabled) remove(storageKey);
  }, [storageKey, enabled]);

  const columnOrder = useMemo(() => [...order, ...pinnedKeys], [order, pinnedKeys]);
  const visibleColumns = useMemo(() => [...visible, ...pinnedKeys], [visible, pinnedKeys]);

  return { columnOrder, visibleColumns, onApplySettings, reset };
}