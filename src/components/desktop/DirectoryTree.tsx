import React, { useState, useEffect } from 'react';
import { Theme } from "../../themes/theme";
import { Button, Modal, SearchableSelect, TextInput } from "../../index";

// ===== Типы данных =====
export interface DirectoryItem {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
  sort_order?: number;
}

export interface DirectoryApi {
  getRoots(): Promise<DirectoryItem[]>;
  getChildren(parentId: number): Promise<DirectoryItem[]>;
  createItem(data: { parent_id: number | null; name: string; type: string }): Promise<DirectoryItem>;
  updateItem(id: number, data: { name?: string; type?: string }): Promise<void>;
  deleteItem(id: number): Promise<void>;
  moveItem(id: number, direction: 'up' | 'down'): Promise<void>;
}

export interface DirectoryTreeProps {
  theme: Theme;
  isAuthenticated: boolean;
  api: DirectoryApi;
  directoryTypes: { value: string; label: string }[];
  typeLabels: Record<string, string>;
  storageKey?: string;
  /** true → может управлять корневыми элементами (создавать/редактировать/удалять/перемещать). */
  isWebAdmin?: boolean;
  /** null / [] → все корни разрешены; иначе — только перечисленные id. */
  allowedDirectoryRoots?: number[] | null;
}

// ===== Внутренняя модалка =====
interface DirectoryAddProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; type: string }) => void;
  theme: Theme;
  initialName?: string;
  initialType?: string;
  showTypeSelector: boolean;
  title?: string;
  confirmText?: string;
  directoryTypes: { value: string; label: string }[];
}

function DirectoryAdd({
  isOpen, onClose, onSave, theme,
  initialName = '', initialType = '',
  showTypeSelector,
  title = 'Добавить элемент',
  confirmText = 'Добавить',
  directoryTypes,
}: DirectoryAddProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setType(initialType);
    }
  }, [isOpen, initialName, initialType]);

  const handleSave = () => {
    if (!name.trim()) return alert('Введите название');
    if (showTypeSelector && !type) return alert('Выберите тип');
    onSave({ name: name.trim(), type: type || initialType });
    onClose();
  };

  const typeOptions = directoryTypes.map(({ value, label }) => ({ value, label }));

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      onClose={onClose}
      onOk={handleSave}
      title={title}
      okText={confirmText}
      cancelText="Отмена"
      width={500}
      columns={1}
      rows={2}
      fields={[
        {
          row: 0, col: 0,
          content: (
            <TextInput label="Название" theme={theme} value={name}
              onChange={setName} inputType="text" autoFocus />
          ),
        },
        ...(showTypeSelector
          ? [{
              row: 1, col: 0,
              content: (
                <SearchableSelect label="Тип" theme={theme}
                  options={typeOptions} value={type} onChange={setType} />
              ),
            }]
          : []),
      ]}
      canSubmit={!!name.trim() && (!showTypeSelector || !!type)}
    />
  );
}

// ===== Основной компонент =====
export default function DirectoryTree({
  theme,
  isAuthenticated,
  api,
  directoryTypes,
  typeLabels,
  storageKey = 'last_directory_type',
  isWebAdmin = false,
  allowedDirectoryRoots = null,
}: DirectoryTreeProps) {
  const [itemsByLevel, setItemsByLevel] = useState<Record<number, DirectoryItem[]>>({});
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentParent, setCurrentParent] = useState<{ id: number | null; type: string; level: number } | null>(null);
  const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DirectoryItem | null>(null);

  /* ---------- Права ---------- */

  /** Может управлять корневыми элементами. */
  const canManageRoots = isAuthenticated && isWebAdmin;

  /** Разрешён ли корень по настройке роли. */
  const isRootAllowedLocal = (rootId: number | null | undefined): boolean => {
    if (!rootId) return false;
    if (isWebAdmin) return true;
    const allowed = allowedDirectoryRoots;
    if (allowed === null || allowed === undefined) return true;
    if (!Array.isArray(allowed) || allowed.length === 0) return true;
    return allowed.includes(rootId);
  };

  /** Может ли пользователь изменять конкретный элемент на уровне. */
  const canModify = (level: number): boolean => {
    if (!isAuthenticated) return false;
    if (level === 0) return canManageRoots;
    // Для дочерних — проверяем корень по selectedPath[0]
    return isRootAllowedLocal(selectedPath[0]);
  };

  /* ---------- localStorage ---------- */
  const getLastType = (): string =>
    localStorage.getItem(storageKey) || directoryTypes[0]?.value || '';
  const setLastType = (type: string) => localStorage.setItem(storageKey, type);

  /* ---------- Загрузка ---------- */
  const loadRoots = async () => {
    setLoading(true);
    try {
      const roots = await api.getRoots();
      const rootsWithType = roots.map(item => ({ ...item, type: 'root' }));
      setItemsByLevel(prev => ({ ...prev, 0: rootsWithType }));
      if (rootsWithType.length > 0 && selectedPath.length === 0) {
        handleRootSelect(rootsWithType[0]);
      }
    } catch (e) {
      console.error('Failed to load roots', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoots(); }, []);

  const loadChildrenByParentId = async (parentId: number, level: number) => {
    try {
      const children = await api.getChildren(parentId);
      setItemsByLevel(prev => ({ ...prev, [level]: children }));
    } catch (e) {
      console.error('Failed to load children', e);
    }
  };

  const handleRootSelect = async (rootItem: DirectoryItem) => {
    setSelectedPath([rootItem.id]);
    await loadChildrenByParentId(rootItem.id, 1);
    setItemsByLevel(prev => {
      const newItems = { ...prev };
      for (const lvl in newItems) {
        if (Number(lvl) > 1) delete newItems[lvl];
      }
      return newItems;
    });
  };

  const handleSelect = async (item: DirectoryItem, level: number) => {
    const newPath = selectedPath.slice(0, level);
    newPath.push(item.id);
    setSelectedPath(newPath);

    const nextLevel = level + 1;
    await loadChildrenByParentId(item.id, nextLevel);
    setItemsByLevel(prev => {
      const newItems = { ...prev };
      for (const lvl in newItems) {
        if (Number(lvl) > nextLevel) delete newItems[lvl];
      }
      return newItems;
    });
  };

  /* ---------- Добавление ---------- */
  const handleAddClick = (parentId: number | null, type: string, level: number) => {
    if (!canModify(level)) return;
    setCurrentParent({ id: parentId, type, level });
    setAddModalOpen(true);
  };

  const handleAddSave = async (data: { name: string; type: string }) => {
    try {
      const parentId = currentParent?.id ?? null;
      const typeToUse = currentParent?.level === 0 ? 'root' : data.type;
      await api.createItem({ parent_id: parentId, name: data.name, type: typeToUse });
      if (currentParent?.level !== 0) setLastType(data.type);
      if (currentParent?.level === 0) {
        await loadRoots();
      } else {
        await loadChildrenByParentId(parentId!, currentParent!.level);
      }
      setAddModalOpen(false);
    } catch (e) {
      console.error('Failed to add item', e);
      alert('Ошибка добавления');
    }
  };

  /* ---------- Редактирование ---------- */
  const handleEditClick = (item: DirectoryItem, level: number) => {
    if (!canModify(level)) return;
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleEditSave = async (data: { name: string; type: string }) => {
    if (!editingItem) return;
    try {
      await api.updateItem(editingItem.id, { name: data.name, type: data.type });
      setItemsByLevel(prev => {
        const newItems = { ...prev };
        for (const level in newItems) {
          newItems[level] = newItems[level].map(el =>
            el.id === editingItem.id ? { ...el, name: data.name, type: data.type || el.type } : el
          );
        }
        return newItems;
      });
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error('Failed to edit item', e);
      alert('Ошибка редактирования');
    }
  };

  /* ---------- Удаление ---------- */
  const handleDeleteClick = (item: DirectoryItem, level: number) => {
    if (!canModify(level)) return;
    setDeletingItem(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await api.deleteItem(deletingItem.id);
      setItemsByLevel(prev => {
        const newItems = { ...prev };
        for (const level in newItems) {
          newItems[level] = newItems[level].filter(el => el.id !== deletingItem.id);
        }
        return newItems;
      });
      if (selectedPath.includes(deletingItem.id)) {
        const idx = selectedPath.indexOf(deletingItem.id);
        setSelectedPath(selectedPath.slice(0, idx));
        setItemsByLevel(prev => {
          const newItems = { ...prev };
          for (const lvl in newItems) {
            if (Number(lvl) > idx) delete newItems[lvl];
          }
          return newItems;
        });
      }
      setDeleteModalOpen(false);
      setDeletingItem(null);
    } catch (e) {
      console.error('Failed to delete item', e);
      alert('Ошибка удаления');
    }
  };

  /* ---------- Перемещение ---------- */
  const handleMove = async (item: DirectoryItem, direction: 'up' | 'down', level: number) => {
    if (!canModify(level)) return;
    try {
      await api.moveItem(item.id, direction);
      const parentId = level === 0 ? null : selectedPath[level - 1];
      if (level === 0) {
        await loadRoots();
      } else {
        await loadChildrenByParentId(parentId!, level);
      }
    } catch (e) {
      console.error('Failed to move item', e);
      alert('Ошибка перемещения');
    }
  };

  /* ---------- Вспомогательные ---------- */
  const findItemById = (id: number): DirectoryItem | undefined => {
    for (const level in itemsByLevel) {
      const found = itemsByLevel[level].find(item => item.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const getLevelTitle = (level: number) => {
    if (level === 0) return 'Справочники';
    const parentId = selectedPath[level - 1];
    if (!parentId) return `Уровень ${level}`;
    const parent = findItemById(parentId);
    if (!parent) return `Уровень ${level}`;
    const items = itemsByLevel[level] || [];
    if (items.length === 0) return `Уровень ${level}`;
    const firstItem = items[0];
    return typeLabels[firstItem.type] || firstItem.type;
  };

  const getMoveButtons = (item: DirectoryItem, level: number) => {
    const items = itemsByLevel[level] || [];
    const index = items.findIndex(el => el.id === item.id);
    return { canMoveUp: index > 0, canMoveDown: index < items.length - 1 };
  };

  /* ---------- Рендеринг ---------- */
  const levels = Object.keys(itemsByLevel).map(Number).sort((a, b) => a - b);
  const maxLevel = levels.length ? Math.max(...levels) : 0;

  return (
    <>
      <div style={{ display: 'flex', gap: 24, overflow: 'auto', height: '100%', paddingBottom: '10px' }}>
        {levels.map((level) => {
          const items = itemsByLevel[level] || [];
          const parentId = level === 0 ? null : selectedPath[level - 1] || null;
          const type = level === 0 ? 'root' : (findItemById(selectedPath[level - 1])?.type || '');
          const levelEditable = canModify(level);

          return (
            <div
              key={level}
              style={{
                minWidth: 200, maxWidth: 300, flexShrink: 0,
                borderRight: level < maxLevel ? `1px solid ${theme.border}` : 'none',
                paddingRight: 16,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: theme.textMuted }}>
                {getLevelTitle(level)}
              </div>
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {items.map(item => {
                  const { canMoveUp, canMoveDown } = getMoveButtons(item, level);
                  const isSelected = selectedPath[level] === item.id;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                        background: isSelected ? theme.selectedBg : 'transparent',
                        color: isSelected ? theme.accent : theme.text,
                        marginBottom: 4, display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onClick={() => {
                        if (level === 0) handleRootSelect(item);
                        else handleSelect(item, level);
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '10px' }}>
                        <span>{item.name}</span>
                        {level > 0 && (
                          <span style={{ fontSize: '11px', fontStyle: 'italic', color: theme.textMuted }}>
                            {typeLabels[item.type] || item.type}
                          </span>
                        )}
                      </div>

                      {/* ⬇ Кнопки действий — только если уровень редактируется */}
                      {levelEditable && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {canMoveUp && (
                            <Button icon="↑" variant="primary" outline size="sm"
                              onClick={(e) => { e.stopPropagation(); handleMove(item, 'up', level); }}
                              theme={theme}
                              style={{ padding: '2px 6px', fontSize: '12px' }} />
                          )}
                          {canMoveDown && (
                            <Button icon="↓" variant="primary" outline size="sm"
                              onClick={(e) => { e.stopPropagation(); handleMove(item, 'down', level); }}
                              theme={theme}
                              style={{ padding: '2px 6px', fontSize: '12px' }} />
                          )}
                          <Button icon="✎" variant="primary" outline size="sm"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(item, level); }}
                            theme={theme} />
                          <Button icon="✕" variant="danger" outline size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item, level); }}
                            theme={theme} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ⬇ Кнопка «+ Добавить» — только если уровень редактируется */}
              {levelEditable && (
                <Button
                  icon="＋"
                  variant="primary"
                  size="sm"
                  onClick={() => handleAddClick(parentId, type, level)}
                  theme={theme}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  Добавить
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Модалки */}
      <DirectoryAdd
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddSave}
        theme={theme}
        showTypeSelector={currentParent?.level !== 0}
        initialType={currentParent?.level === 0 ? 'root' : getLastType()}
        title={currentParent?.level === 0 ? 'Добавить корневой справочник' : 'Добавить элемент'}
        confirmText="Добавить"
        directoryTypes={directoryTypes}
      />

      <DirectoryAdd
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingItem(null); }}
        onSave={handleEditSave}
        theme={theme}
        showTypeSelector={editingItem?.type !== 'root'}
        initialName={editingItem?.name || ''}
        initialType={editingItem?.type || ''}
        title="Редактировать"
        confirmText="Сохранить"
        directoryTypes={directoryTypes}
      />

      {deleteModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: theme.bgSurface, padding: '30px',
            borderRadius: 12, maxWidth: 400, boxShadow: theme.shadowLg,
          }}>
            <h3 style={{ color: theme.text, marginTop: 0 }}>Подтверждение удаления</h3>
            <p style={{ color: theme.text }}>
              Вы уверены, что хотите удалить элемент <strong>{deletingItem?.name}</strong>?
            </p>
            <p style={{ color: theme.danger, fontSize: '13px' }}>
              Все дочерние элементы также будут удалены.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="primary" outline size="md"
                onClick={() => { setDeleteModalOpen(false); setDeletingItem(null); }}
                theme={theme}>Отмена</Button>
              <Button variant="danger" size="md" onClick={handleDeleteConfirm} theme={theme}>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}