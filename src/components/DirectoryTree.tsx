// DirectoryTree.tsx — единый справочник. Объединяет DirectoryTree и
// MobileDirectoryTree: на узком экране — drill-down с хлебными крошками,
// на десктопе — колонки уровней. Хук useDirectoryTree, модалка формы и
// storage-утилиты встроены сюда (наружу не нужны).
//
// ИЗМЕНЕНИЕ: корни справочника поддерживают ACL (DirectoryItem.acl).
// Ресурс регистрируется сам, без права корень не показывается.
// Права на CRUD внутри дерева по-прежнему задаются пропсами
// creatable / editable / deletable и allowedDirectoryRoots.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '../themes/theme';
import Button from './Button';
import Modal from './Modal';
import CustomInput from './CustomInput';
import CustomSelect from './CustomSelect';
import { IcoChevronLeft, IcoChevronRight } from './icons';
import { useResponsive } from '../context/AppContext';
import { useAcl, registerResource } from '../acl';

/* ───────────────────────── Типы ───────────────────────── */

/** Элемент справочника. */
export interface DirectoryItem {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
  sort_order?: number;
  /** Идентификатор ресурса корневого справочника ('directory.hr'). */
  acl?: string;
}

/** API справочника (реализуется в проекте). */
export interface DirectoryApi {
  getRoots(): Promise<DirectoryItem[]>;
  getChildren(parentId: number): Promise<DirectoryItem[]>;
  createItem(data: { parent_id: number | null; name: string; type: string }): Promise<DirectoryItem>;
  updateItem(id: number, data: { name?: string; type?: string }): Promise<void>;
  deleteItem(id: number): Promise<void>;
  moveItem(id: number, direction: 'up' | 'down'): Promise<void>;
}

export interface DirectoryTreeProps {
  /** Тема оформления. */
  theme: Theme;
  /** Авторизован ли пользователь. */
  isAuthenticated: boolean;
  /** API справочника. */
  api: DirectoryApi;
  /** Типы для селектора. */
  directoryTypes: { value: string; label: string }[];
  /** Подписи типов. */
  typeLabels: Record<string, string>;
  /** Ключ localStorage для последнего типа. @default 'last_directory_type' */
  storageKey?: string;
  /** Права web-админа (управление корнями). */
  isWebAdmin?: boolean;
  /** Разрешённые корни (null/[] — все). */
  allowedDirectoryRoots?: number[] | null;
  /** Разрешить создание. @default true */
  creatable?: boolean;
  /** Разрешить редактирование. @default true */
  editable?: boolean;
  /** Разрешить удаление. @default true */
  deletable?: boolean;
  /** Колбэк ошибок (toast). По умолчанию console.error. */
  onError?: (message: string) => void;
}

/* ───────────────────────── storage ───────────────────────── */

const safeGet = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

/* ───────────────────────── Хук состояния дерева ───────────────────────── */

function useDirectoryTree(opts: DirectoryTreeProps & { autoSelectFirstRoot: boolean }) {
  const {
    api, isAuthenticated, isWebAdmin = false, allowedDirectoryRoots = null,
    creatable = true, editable = true, deletable = true,
    storageKey = 'last_directory_type', directoryTypes, onError, autoSelectFirstRoot,
  } = opts;

  const { can } = useAcl();

  // Свежие пропсы через ref: смена ссылки api не сбрасывает путь.
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);

  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const notifyError = useCallback((msg: string) => {
    if (onErrorRef.current) onErrorRef.current(msg); else console.error(msg);
  }, []);

  const [itemsByLevel, setItemsByLevel] = useState<Record<number, DirectoryItem[]>>({});
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const navReq = useRef(0); // защита от гонок при быстрой навигации

  const getLastType = useCallback(() => safeGet(storageKey) || directoryTypes[0]?.value || '', [storageKey, directoryTypes]);
  const setLastType = useCallback((type: string) => safeSet(storageKey, type), [storageKey]);

  const applyChildren = useCallback((level: number, children: DirectoryItem[], clearDeeper: boolean) => {
    setItemsByLevel((prev) => {
      const next: Record<number, DirectoryItem[]> = { ...prev, [level]: children };
      if (clearDeeper) for (const k of Object.keys(next)) if (Number(k) > level) delete next[Number(k)];
      return next;
    });
  }, []);

  // Регистрируем все корни (даже скрытые) — редактор ролей должен их видеть.
  const prepareRoots = useCallback((raw: DirectoryItem[]): DirectoryItem[] => {
    const roots = raw.map((r) => ({ ...r, type: 'root' }));
    for (const root of roots) {
      if (root.acl) registerResource({ id: root.acl, kind: 'directory', label: root.name });
    }
    return roots.filter((root) => can(root.acl));
  }, [can]);

  const loadRoots = useCallback(async (autoSelect: boolean) => {
    const req = ++navReq.current;
    setLoading(true);
    try {
      const rawRoots = await apiRef.current.getRoots();
      if (req !== navReq.current) return;
      const roots = prepareRoots(rawRoots);
      if (autoSelect && roots.length > 0) {
        const first = roots[0];
        let children: DirectoryItem[] = [];
        try { children = await apiRef.current.getChildren(first.id); } catch { /* ignore */ }
        if (req !== navReq.current) return;
        setItemsByLevel({ 0: roots, 1: children });
        setSelectedPath([first.id]);
      } else {
        setItemsByLevel({ 0: roots });
        setSelectedPath([]);
      }
    } catch {
      if (req === navReq.current) notifyError('Не удалось загрузить справочники');
    } finally {
      if (req === navReq.current) setLoading(false);
    }
  }, [notifyError, prepareRoots]);

  useEffect(() => { void loadRoots(autoSelectFirstRoot); }, [autoSelectFirstRoot, loadRoots]);

  /* Права */

  const canManageRoots = isAuthenticated && !!isWebAdmin;

  const isRootAllowed = useCallback((rootId: number | null | undefined): boolean => {
    if (!rootId) return false;
    if (isWebAdmin) return true;
    if (allowedDirectoryRoots == null || !Array.isArray(allowedDirectoryRoots) || allowedDirectoryRoots.length === 0) return true;
    return allowedDirectoryRoots.includes(rootId);
  }, [isWebAdmin, allowedDirectoryRoots]);

  const levelRight = useCallback((flag: boolean, level: number): boolean => {
    if (!flag || !isAuthenticated) return false;
    if (level === 0) return canManageRoots;
    return isRootAllowed(selectedPath[0]);
  }, [isAuthenticated, canManageRoots, isRootAllowed, selectedPath]);

  const canCreate = useCallback((level: number) => levelRight(creatable, level), [levelRight, creatable]);
  const canEdit = useCallback((level: number) => levelRight(editable, level), [levelRight, editable]);
  const canDelete = useCallback((level: number) => levelRight(deletable, level), [levelRight, deletable]);

  /* Навигация */

  const selectItem = useCallback(async (item: DirectoryItem, level: number) => {
    const req = ++navReq.current;
    setSelectedPath((prev) => [...prev.slice(0, level), item.id]);
    setLoading(true);
    try {
      const children = await apiRef.current.getChildren(item.id);
      if (req !== navReq.current) return;
      applyChildren(level + 1, children, true);
    } catch {
      if (req === navReq.current) notifyError('Не удалось загрузить');
    } finally {
      if (req === navReq.current) setLoading(false);
    }
  }, [applyChildren, notifyError]);

  const goBackTo = useCallback((level: number) => {
    navReq.current++;
    setSelectedPath((prev) => prev.slice(0, level));
  }, []);

  /* CRUD */

  const addItem = useCallback(async (level: number, data: { name: string; type: string }): Promise<boolean> => {
    const parentId = level === 0 ? null : selectedPath[level - 1] ?? null;
    const typeToUse = level === 0 ? 'root' : data.type;
    setMutating(true);
    try {
      await apiRef.current.createItem({ parent_id: parentId, name: data.name, type: typeToUse });
      if (level !== 0) setLastType(data.type);
      if (level === 0) {
        applyChildren(0, prepareRoots(await apiRef.current.getRoots()), false);
      } else if (parentId != null) {
        applyChildren(level, await apiRef.current.getChildren(parentId), false);
      }
      return true;
    } catch {
      notifyError('Не удалось добавить элемент');
      return false;
    } finally {
      setMutating(false);
    }
  }, [selectedPath, applyChildren, setLastType, notifyError, prepareRoots]);

  const editItem = useCallback(async (id: number, data: { name: string; type: string }): Promise<boolean> => {
    setMutating(true);
    try {
      await apiRef.current.updateItem(id, { name: data.name, type: data.type });
      setItemsByLevel((prev) => {
        const next: Record<number, DirectoryItem[]> = {};
        for (const k of Object.keys(prev)) {
          next[Number(k)] = prev[Number(k)].map((el) =>
            el.id === id ? { ...el, name: data.name, type: data.type || el.type } : el);
        }
        return next;
      });
      return true;
    } catch {
      notifyError('Не удалось сохранить изменения');
      return false;
    } finally {
      setMutating(false);
    }
  }, [notifyError]);

  const deleteItem = useCallback(async (id: number): Promise<boolean> => {
    setMutating(true);
    try {
      await apiRef.current.deleteItem(id);
      const idx = selectedPath.indexOf(id);
      if (idx !== -1) setSelectedPath((prev) => prev.slice(0, idx));
      setItemsByLevel((prev) => {
        const next: Record<number, DirectoryItem[]> = {};
        for (const k of Object.keys(prev)) {
          const n = Number(k);
          if (idx !== -1 && n > idx) continue;
          next[n] = prev[n].filter((el) => el.id !== id);
        }
        return next;
      });
      return true;
    } catch {
      notifyError('Не удалось удалить элемент');
      return false;
    } finally {
      setMutating(false);
    }
  }, [selectedPath, notifyError]);

  const moveItem = useCallback(async (item: DirectoryItem, level: number, direction: 'up' | 'down'): Promise<boolean> => {
    setMutating(true);
    try {
      await apiRef.current.moveItem(item.id, direction);
      if (level === 0) {
        applyChildren(0, prepareRoots(await apiRef.current.getRoots()), false);
      } else {
        const parentId = selectedPath[level - 1];
        if (parentId != null) applyChildren(level, await apiRef.current.getChildren(parentId), false);
      }
      return true;
    } catch {
      notifyError('Не удалось переместить элемент');
      return false;
    } finally {
      setMutating(false);
    }
  }, [selectedPath, applyChildren, notifyError, prepareRoots]);

  const itemById = useMemo(() => {
    const m = new Map<number, DirectoryItem>();
    for (const k of Object.keys(itemsByLevel)) for (const item of itemsByLevel[Number(k)]) m.set(item.id, item);
    return m;
  }, [itemsByLevel]);

  const levels = useMemo(() => Object.keys(itemsByLevel).map(Number).sort((a, b) => a - b), [itemsByLevel]);
  const maxLevel = levels.length ? Math.max(...levels) : 0;

  return {
    itemsByLevel, selectedPath, loading, mutating, itemById, levels, maxLevel,
    canCreate, canEdit, canDelete, getLastType,
    selectItem, goBackTo, addItem, editItem, deleteItem, moveItem,
  };
}

/* ───────────────────────── Модалка формы ───────────────────────── */

function DirectoryFormModal({ theme, isOpen, onClose, onSave, title, okText, showTypeSelector, initialName = '', initialType = '', directoryTypes }: {
  theme: Theme; isOpen: boolean; onClose: () => void;
  onSave: (data: { name: string; type: string }) => Promise<boolean>;
  title: string; okText: string; showTypeSelector: boolean;
  initialName?: string; initialType?: string;
  directoryTypes: { value: string; label: string }[];
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [nameError, setNameError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setName(initialName); setType(initialType); setNameError(''); setTypeError(''); setSaving(false); }
  }, [isOpen, initialName, initialType]);

  const handleSave = async () => {
    setNameError(''); setTypeError('');
    let hasError = false;
    if (!name.trim()) { setNameError('Введите название'); hasError = true; }
    if (showTypeSelector && !type) { setTypeError('Выберите тип'); hasError = true; }
    if (hasError) return;
    setSaving(true);
    try {
      const ok = await onSave({ name: name.trim(), type: type || initialType });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal theme={theme} isOpen={isOpen} onClose={onClose} onOk={handleSave}
      title={title} okText={okText} cancelText="Отмена" width={500}
      columns={1} rows={showTypeSelector ? 2 : 1}
      canSubmit={!saving && !!name.trim() && (!showTypeSelector || !!type)}
      fields={[
        { row: 0, col: 0, required: true, content: (
          <CustomInput label="Название" theme={theme} value={name} onChange={setName} autoFocus error={nameError || undefined} />
        ) },
        ...(showTypeSelector ? [{
          row: 1, col: 0, required: true, content: (
            <CustomSelect label="Тип" theme={theme} options={directoryTypes} value={type} onChange={setType} error={typeError || undefined} />
          ),
        }] : []),
      ]} />
  );
}

/* ───────────────────────── Компонент ───────────────────────── */

const TOUCH = 44;

/**
 * Справочник с CRUD и сортировкой. На узком экране — мобильный drill-down,
 * на десктопе — колонки уровней. Заменяет DirectoryTree / MobileDirectoryTree.
 */
export default function DirectoryTree(props: DirectoryTreeProps) {
  const { theme: t, directoryTypes, typeLabels } = props;
  const { isMobile } = useResponsive();
  const tree = useDirectoryTree({ ...props, autoSelectFirstRoot: !isMobile });

  const {
    itemsByLevel, selectedPath, itemById, levels, maxLevel, loading, mutating,
    canCreate, canEdit, canDelete, getLastType,
    selectItem, goBackTo, addItem, editItem, deleteItem, moveItem,
  } = tree;

  const [addLevel, setAddLevel] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DirectoryItem | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    const ok = await deleteItem(deletingItem.id);
    if (ok) setDeletingItem(null);
  };

  const currentLevel = selectedPath.length;
  const currentItems = itemsByLevel[currentLevel] ?? [];

  const getLevelTitle = (level: number) => {
    if (level === 0) return 'Справочники';
    const items = itemsByLevel[level] || [];
    if (!selectedPath[level - 1] || !itemById.get(selectedPath[level - 1]) || items.length === 0) return `Уровень ${level}`;
    return typeLabels[items[0].type] || items[0].type;
  };

  const itemActions = (item: DirectoryItem, level: number, idx: number, count: number, size: 'sm' | 'md') => {
    const levelEditable = canEdit(level);
    const levelDeletable = canDelete(level);
    if (!levelEditable && !levelDeletable) return null;
    return (
      <div style={{ display: 'flex', gap: size === 'md' ? 6 : 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {levelEditable && idx > 0 && (
          <Button icon="↑" variant="primary" outline size={size} theme={t} aria-label="Переместить вверх"
            disabled={mutating} onClick={(e) => { e.stopPropagation(); moveItem(item, level, 'up'); }} />
        )}
        {levelEditable && idx < count - 1 && (
          <Button icon="↓" variant="primary" outline size={size} theme={t} aria-label="Переместить вниз"
            disabled={mutating} onClick={(e) => { e.stopPropagation(); moveItem(item, level, 'down'); }} />
        )}
        {levelEditable && (
          <Button icon="✎" variant="primary" outline size={size} theme={t} aria-label="Редактировать"
            disabled={mutating} onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} />
        )}
        {levelDeletable && (
          <Button icon="✕" variant="danger" outline size={size} theme={t} aria-label="Удалить"
            disabled={mutating} onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} />
        )}
      </div>
    );
  };

  /* ── Desktop: колонки уровней ── */

  const desktopView = (
    <div style={{ display: 'flex', gap: 24, overflow: 'auto', height: '100%', paddingBottom: 10 }}>
      {levels.map((level) => {
        const items = itemsByLevel[level] || [];
        return (
          <div key={level} style={{
            minWidth: 200, maxWidth: 300, flexShrink: 0,
            borderRight: level < maxLevel ? `1px solid ${t.border}` : 'none', paddingRight: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: t.textMuted }}>{getLevelTitle(level)}</div>
            <div style={{ maxHeight: '70dvh', overflowY: 'auto' }}>
              {items.map((item, idx) => {
                const isSelected = selectedPath[level] === item.id;
                return (
                  <div key={item.id} onClick={() => selectItem(item, level)}
                    style={{
                      padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                      background: isSelected ? t.selectedBg : 'transparent',
                      color: isSelected ? t.accent : t.text, marginBottom: 4,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: 10, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      {level > 0 && (
                        <span style={{ fontSize: 11, fontStyle: 'italic', color: t.textMuted }}>
                          {typeLabels[item.type] || item.type}
                        </span>
                      )}
                    </div>
                    {itemActions(item, level, idx, items.length, 'sm')}
                  </div>
                );
              })}
            </div>
            {canCreate(level) && (
              <Button icon="＋" variant="primary" size="sm" theme={t} style={{ width: '100%', marginTop: 12 }}
                disabled={loading || mutating} onClick={() => setAddLevel(level)}>
                Добавить
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── Mobile: drill-down ── */

  const crumbs = selectedPath.map((id) => itemById.get(id)?.name ?? '…');
  const levelCreatable = canCreate(currentLevel);

  const mobileView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: t.text }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
        background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, minHeight: TOUCH + 4,
      }}>
        {currentLevel > 0 && (
          <button type="button" onClick={() => goBackTo(currentLevel - 1)} aria-label="Назад"
            style={{
              background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: TOUCH, minHeight: TOUCH, flexShrink: 0,
            }}>
            <IcoChevronLeft s={20} />
          </button>
        )}
        <div style={{ flex: 1, fontSize: 13, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <button type="button" onClick={() => currentLevel !== 0 && goBackTo(0)}
            style={{
              background: 'transparent', border: 'none', padding: '8px 2px', minHeight: TOUCH,
              color: currentLevel === 0 ? t.text : t.accent,
              cursor: currentLevel === 0 ? 'default' : 'pointer',
              fontWeight: currentLevel === 0 ? 600 : 400, fontSize: 13,
            }}>
            Справочники
          </button>
          {crumbs.map((name, i) => {
            const isLast = i + 1 === currentLevel;
            return (
              <span key={selectedPath[i]}>
                {' / '}
                <button type="button" onClick={() => !isLast && goBackTo(i + 1)}
                  style={{
                    background: 'transparent', border: 'none', padding: '8px 2px', minHeight: TOUCH,
                    color: isLast ? t.text : t.accent, cursor: isLast ? 'default' : 'pointer',
                    fontWeight: isLast ? 600 : 400, fontSize: 13,
                  }}>
                  {name}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && currentItems.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: t.placeholder }}>Загрузка…</div>
        )}
        {!loading && currentItems.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center', color: t.placeholder, background: t.bgSurface,
            border: `1px dashed ${t.border}`, borderRadius: 12, fontSize: 14,
          }}>
            Нет элементов. {levelCreatable && 'Нажмите «Добавить».'}
          </div>
        )}
        {currentItems.map((item, idx) => {
          // Эвристика: у type 'item' детей быть не может.
          const canDrill = item.type !== 'item';
          return (
            <div key={item.id} style={{
              background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12,
              padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div onClick={() => canDrill && selectItem(item, currentLevel)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  cursor: canDrill ? 'pointer' : 'default', minHeight: TOUCH,
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  {currentLevel > 0 && (
                    <span style={{ fontSize: 11, fontStyle: 'italic', color: t.textMuted }}>
                      {typeLabels[item.type] || item.type}
                    </span>
                  )}
                </div>
                {canDrill && <span style={{ color: t.iconColor, display: 'flex', flexShrink: 0 }}><IcoChevronRight s={18} /></span>}
              </div>
              {(canEdit(currentLevel) || canDelete(currentLevel)) && (
                <div style={{ borderTop: `1px solid ${t.borderSubtle}`, paddingTop: 10 }}>
                  {itemActions(item, currentLevel, idx, currentItems.length, 'md')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {levelCreatable && (
        <Button icon="＋" variant="primary" size="md" theme={t} disabled={loading || mutating}
          onClick={() => setAddLevel(currentLevel)}>
          {currentLevel === 0 ? 'Добавить справочник' : 'Добавить элемент'}
        </Button>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? mobileView : desktopView}

      <DirectoryFormModal theme={t} isOpen={addLevel !== null} onClose={() => setAddLevel(null)}
        onSave={(data) => addLevel === null ? Promise.resolve(false) : addItem(addLevel, data)}
        title={addLevel === 0 ? 'Добавить корневой справочник' : 'Добавить элемент'}
        okText="Добавить" showTypeSelector={addLevel !== 0 && addLevel !== null}
        initialType={addLevel === 0 ? 'root' : getLastType()} directoryTypes={directoryTypes} />

      <DirectoryFormModal theme={t} isOpen={!!editingItem} onClose={() => setEditingItem(null)}
        onSave={(data) => editingItem ? editItem(editingItem.id, data) : Promise.resolve(false)}
        title="Редактировать" okText="Сохранить"
        showTypeSelector={editingItem?.type !== 'root'}
        initialName={editingItem?.name || ''} initialType={editingItem?.type || ''}
        directoryTypes={directoryTypes} />

      <Modal theme={t} isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onOk={handleDeleteConfirm}
        title="Подтверждение удаления" okText="Удалить" cancelText="Отмена" width={420}
        columns={1} rows={1} canSubmit={!mutating}
        fields={[{
          row: 0, col: 0, content: (
            <div style={{ color: t.text, fontSize: 14, lineHeight: 1.5 }}>
              Удалить элемент <strong>{deletingItem?.name}</strong>?
              <br />
              <span style={{ color: t.danger, fontSize: 13 }}>Все дочерние элементы также будут удалены.</span>
            </div>
          ),
        }]} />
    </>
  );
}