import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DirectoryItem } from './types';
import type { DirectoryApi } from './types';
import { safeStorageGet, safeStorageSet } from './storage';

export interface UseDirectoryTreeOptions {
  api: DirectoryApi;
  isAuthenticated: boolean;
  isWebAdmin?: boolean;
  allowedDirectoryRoots?: number[] | null;
  creatable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  storageKey?: string;
  directoryTypes?: { value: string; label: string }[];
  onError?: (message: string) => void;
  /** true — после загрузки корней сразу раскрыть первый (desktop). */
  autoSelectFirstRoot?: boolean;
}

export interface UseDirectoryTreeResult {
  itemsByLevel: Record<number, DirectoryItem[]>;
  selectedPath: number[];
  loading: boolean;
  mutating: boolean;

  itemById: Map<number, DirectoryItem>;
  levels: number[];
  maxLevel: number;

  canManageRoots: boolean;
  canCreate: (level: number) => boolean;
  canEdit: (level: number) => boolean;
  canDelete: (level: number) => boolean;

  getLastType: () => string;
  setLastType: (type: string) => void;

  selectItem: (item: DirectoryItem, level: number) => Promise<void>;
  goBackTo: (level: number) => void;
  /** Явная перезагрузка корней (сброс пути). Вызывайте вручную, если сменился api. */
  reload: () => Promise<void>;

  addItem: (level: number, data: { name: string; type: string }) => Promise<boolean>;
  editItem: (id: number, data: { name: string; type: string }) => Promise<boolean>;
  deleteItem: (id: number) => Promise<boolean>;
  moveItem: (
    item: DirectoryItem,
    level: number,
    direction: 'up' | 'down'
  ) => Promise<boolean>;
}

export function useDirectoryTree(
  opts: UseDirectoryTreeOptions
): UseDirectoryTreeResult {
  const {
    api,
    isAuthenticated,
    isWebAdmin = false,
    allowedDirectoryRoots = null,
    creatable = true,
    editable = true,
    deletable = true,
    storageKey = 'last_directory_type',
    directoryTypes = [],
    onError,
    autoSelectFirstRoot = false,
  } = opts;

  /* ---------- Рефы на «свежие» пропсы ----------
   * Ключевой фикс: init-эффект больше не зависит от api.
   * Если потребитель передал нестабильный api (как в demo — inline объект),
   * это не должно сбрасывать selectedPath. Для явного refetch — reload().
   */
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  const notifyError = useCallback((msg: string) => {
    if (onErrorRef.current) onErrorRef.current(msg);
    else console.error(msg);
  }, []);

  /* ---------- Состояние ---------- */
  const [itemsByLevel, setItemsByLevel] = useState<
    Record<number, DirectoryItem[]>
  >({});
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  /* ---------- storage ---------- */
  const getLastType = useCallback(
    () => safeStorageGet(storageKey) || directoryTypes[0]?.value || '',
    [storageKey, directoryTypes]
  );
  const setLastType = useCallback(
    (type: string) => safeStorageSet(storageKey, type),
    [storageKey]
  );

  /* ---------- Утилиты ---------- */
  const applyChildren = useCallback(
    (level: number, children: DirectoryItem[], clearDeeper: boolean) => {
      setItemsByLevel((prev) => {
        const next: Record<number, DirectoryItem[]> = {
          ...prev,
          [level]: children,
        };
        if (clearDeeper) {
          for (const k of Object.keys(next)) {
            if (Number(k) > level) delete next[Number(k)];
          }
        }
        return next;
      });
    },
    []
  );

  /* ---------- Инициализация: ОДИН РАЗ ----------
   * api читаем из ref — смена ссылки api не перезапускает эффект.
   * autoSelectFirstRoot и notifyError стабильны.
   */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rawRoots = await apiRef.current.getRoots();
        if (cancelled) return;
        const roots = rawRoots.map((r) => ({ ...r, type: 'root' }));

        if (autoSelectFirstRoot && roots.length > 0) {
          const first = roots[0];
          let children: DirectoryItem[] = [];
          try {
            children = await apiRef.current.getChildren(first.id);
          } catch (e) {
            console.error('Failed to load children', e);
          }
          if (cancelled) return;
          setItemsByLevel({ 0: roots, 1: children });
          setSelectedPath([first.id]);
        } else {
          setItemsByLevel({ 0: roots });
        }
      } catch (e) {
        console.error('Failed to load roots', e);
        if (!cancelled) notifyError('Не удалось загрузить справочники');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // apiRef — ref (не нужен в deps). notifyError стабилен.
  }, [autoSelectFirstRoot, notifyError]);

  /* ---------- Права ---------- */
  const canManageRoots = isAuthenticated && !!isWebAdmin;

  const isRootAllowed = useCallback(
    (rootId: number | null | undefined): boolean => {
      if (!rootId) return false;
      if (isWebAdmin) return true;
      if (allowedDirectoryRoots == null) return true;
      if (
        !Array.isArray(allowedDirectoryRoots) ||
        allowedDirectoryRoots.length === 0
      )
        return true;
      return allowedDirectoryRoots.includes(rootId);
    },
    [isWebAdmin, allowedDirectoryRoots]
  );

  const canCreate = useCallback(
    (level: number): boolean => {
      if (!creatable || !isAuthenticated) return false;
      if (level === 0) return canManageRoots;
      return isRootAllowed(selectedPath[0]);
    },
    [creatable, isAuthenticated, canManageRoots, isRootAllowed, selectedPath]
  );

  const canEdit = useCallback(
    (level: number): boolean => {
      if (!editable || !isAuthenticated) return false;
      if (level === 0) return canManageRoots;
      return isRootAllowed(selectedPath[0]);
    },
    [editable, isAuthenticated, canManageRoots, isRootAllowed, selectedPath]
  );

  const canDelete = useCallback(
    (level: number): boolean => {
      if (!deletable || !isAuthenticated) return false;
      if (level === 0) return canManageRoots;
      return isRootAllowed(selectedPath[0]);
    },
    [deletable, isAuthenticated, canManageRoots, isRootAllowed, selectedPath]
  );

  /* ---------- Навигация ---------- */
  const selectItem = useCallback(
    async (item: DirectoryItem, level: number) => {
      setSelectedPath([...selectedPath.slice(0, level), item.id]);
      setLoading(true);
      try {
        const children = await apiRef.current.getChildren(item.id);
        applyChildren(level + 1, children, true);
      } catch (e) {
        console.error('Failed to load children', e);
        notifyError('Не удалось загрузить');
      } finally {
        setLoading(false);
      }
    },
    [selectedPath, applyChildren, notifyError]
  );

  const goBackTo = useCallback((level: number) => {
    setSelectedPath((prev) => prev.slice(0, level));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rawRoots = await apiRef.current.getRoots();
      setItemsByLevel({
        0: rawRoots.map((r) => ({ ...r, type: 'root' })),
      });
      setSelectedPath([]);
    } catch (e) {
      console.error('Failed to load roots', e);
      notifyError('Не удалось загрузить справочники');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  /* ---------- CRUD ---------- */
  const addItem = useCallback(
    async (
      level: number,
      data: { name: string; type: string }
    ): Promise<boolean> => {
      const parentId = level === 0 ? null : selectedPath[level - 1] ?? null;
      const typeToUse = level === 0 ? 'root' : data.type;
      setMutating(true);
      try {
        await apiRef.current.createItem({
          parent_id: parentId,
          name: data.name,
          type: typeToUse,
        });
        if (level !== 0) setLastType(data.type);

        if (level === 0) {
          const rawRoots = await apiRef.current.getRoots();
          applyChildren(
            0,
            rawRoots.map((r) => ({ ...r, type: 'root' })),
            false
          );
        } else if (parentId != null) {
          const children = await apiRef.current.getChildren(parentId);
          applyChildren(level, children, false);
        }
        return true;
      } catch (e) {
        console.error('Failed to add item', e);
        notifyError('Не удалось добавить элемент');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [selectedPath, applyChildren, setLastType, notifyError]
  );

  const editItem = useCallback(
    async (
      id: number,
      data: { name: string; type: string }
    ): Promise<boolean> => {
      setMutating(true);
      try {
        await apiRef.current.updateItem(id, {
          name: data.name,
          type: data.type,
        });
        setItemsByLevel((prev) => {
          const next: Record<number, DirectoryItem[]> = {};
          for (const k of Object.keys(prev)) {
            next[Number(k)] = prev[Number(k)].map((el) =>
              el.id === id
                ? { ...el, name: data.name, type: data.type || el.type }
                : el
            );
          }
          return next;
        });
        return true;
      } catch (e) {
        console.error('Failed to edit item', e);
        notifyError('Не удалось сохранить изменения');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [notifyError]
  );

  const deleteItem = useCallback(
    async (id: number): Promise<boolean> => {
      setMutating(true);
      try {
        await apiRef.current.deleteItem(id);

        const idx = selectedPath.indexOf(id);
        if (idx !== -1) {
          setSelectedPath((prev) => prev.slice(0, idx));
        }

        setItemsByLevel((prev) => {
          const next: Record<number, DirectoryItem[]> = {};
          for (const k of Object.keys(prev)) {
            const n = Number(k);
            // Режем более глубокие уровни ТОЛЬКО если удалили предка.
            if (idx !== -1 && n > idx) continue;
            next[n] = prev[n].filter((el) => el.id !== id);
          }
          return next;
        });
        return true;
      } catch (e) {
        console.error('Failed to delete item', e);
        notifyError('Не удалось удалить элемент');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [selectedPath, notifyError]
  );

  const moveItem = useCallback(
    async (
      item: DirectoryItem,
      level: number,
      direction: 'up' | 'down'
    ): Promise<boolean> => {
      setMutating(true);
      try {
        await apiRef.current.moveItem(item.id, direction);
        if (level === 0) {
          const rawRoots = await apiRef.current.getRoots();
          applyChildren(
            0,
            rawRoots.map((r) => ({ ...r, type: 'root' })),
            false
          );
        } else {
          const parentId = selectedPath[level - 1];
          if (parentId != null) {
            const children = await apiRef.current.getChildren(parentId);
            applyChildren(level, children, false);
          }
        }
        return true;
      } catch (e) {
        console.error('Failed to move item', e);
        notifyError('Не удалось переместить элемент');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [selectedPath, applyChildren, notifyError]
  );

  /* ---------- Derived ---------- */
  const itemById = useMemo(() => {
    const m = new Map<number, DirectoryItem>();
    for (const k of Object.keys(itemsByLevel)) {
      for (const item of itemsByLevel[Number(k)]) m.set(item.id, item);
    }
    return m;
  }, [itemsByLevel]);

  const levels = useMemo(
    () =>
      Object.keys(itemsByLevel)
        .map(Number)
        .sort((a, b) => a - b),
    [itemsByLevel]
  );
  const maxLevel = levels.length ? Math.max(...levels) : 0;

  return {
    itemsByLevel,
    selectedPath,
    loading,
    mutating,
    itemById,
    levels,
    maxLevel,
    canManageRoots,
    canCreate,
    canEdit,
    canDelete,
    getLastType,
    setLastType,
    selectItem,
    goBackTo,
    reload,
    addItem,
    editItem,
    deleteItem,
    moveItem,
  };
}