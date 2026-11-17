import React, { useState } from 'react';
import type { Theme } from '../../themes/theme';
import Button from '../inputs/Button';
import Modal from '../Modal';
import { useDirectoryTree } from './useDirectoryTree';
import { DirectoryFormModal } from './DirectoryFormModal';
import type { DirectoryItem, DirectoryApi } from './types';

// Сохраняем обратную совместимость реэкспортов
export type { DirectoryItem, DirectoryApi };

export interface DirectoryTreeProps {
  theme: Theme;
  isAuthenticated: boolean;
  api: DirectoryApi;
  directoryTypes: { value: string; label: string }[];
  typeLabels: Record<string, string>;
  storageKey?: string;
  isWebAdmin?: boolean;
  allowedDirectoryRoots?: number[] | null;
  creatable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  onError?: (message: string) => void;
}

export default function DirectoryTree({
  theme,
  isAuthenticated,
  api,
  directoryTypes,
  typeLabels,
  storageKey = 'last_directory_type',
  isWebAdmin = false,
  allowedDirectoryRoots = null,
  creatable = true,
  editable = true,
  deletable = true,
  onError,
}: DirectoryTreeProps) {
  const tree = useDirectoryTree({
    api,
    isAuthenticated,
    isWebAdmin,
    allowedDirectoryRoots,
    creatable,
    editable,
    deletable,
    storageKey,
    directoryTypes,
    onError,
    autoSelectFirstRoot: true,
  });

  const {
    itemsByLevel,
    selectedPath,
    itemById,
    levels,
    maxLevel,
    loading,
    mutating,
    canCreate,
    canEdit,
    canDelete,
    addItem,
    editItem,
    deleteItem,
    moveItem,
    selectItem,
    getLastType,
  } = tree;

  const [addLevel, setAddLevel] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DirectoryItem | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    const ok = await deleteItem(deletingItem.id);
    if (ok) setDeletingItem(null);
  };

  const getLevelTitle = (level: number) => {
    if (level === 0) return 'Справочники';
    const parentId = selectedPath[level - 1];
    if (!parentId) return `Уровень ${level}`;
    if (!itemById.get(parentId)) return `Уровень ${level}`;
    const items = itemsByLevel[level] || [];
    if (items.length === 0) return `Уровень ${level}`;
    const firstItem = items[0];
    return typeLabels[firstItem.type] || firstItem.type;
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 24,
          overflow: 'auto',
          height: '100%',
          paddingBottom: 10,
        }}
      >
        {levels.map((level) => {
          const items = itemsByLevel[level] || [];
          const levelCreatable = canCreate(level);
          const levelEditable = canEdit(level);
          const levelDeletable = canDelete(level);
          const showActions = levelEditable || levelDeletable;

          return (
            <div
              key={level}
              style={{
                minWidth: 200,
                maxWidth: 300,
                flexShrink: 0,
                borderRight:
                  level < maxLevel ? `1px solid ${theme.border}` : 'none',
                paddingRight: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: theme.textMuted,
                }}
              >
                {getLevelTitle(level)}
              </div>

              <div style={{ maxHeight: '70dvh', overflowY: 'auto' }}>
                {items.map((item, idx) => {
                  const canMoveUp = idx > 0;
                  const canMoveDown = idx < items.length - 1;
                  const isSelected = selectedPath[level] === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: isSelected
                          ? theme.selectedBg
                          : 'transparent',
                        color: isSelected ? theme.accent : theme.text,
                        marginBottom: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onClick={() => selectItem(item, level)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          marginRight: 10,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </span>
                        {level > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontStyle: 'italic',
                              color: theme.textMuted,
                            }}
                          >
                            {typeLabels[item.type] || item.type}
                          </span>
                        )}
                      </div>

                      {showActions && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          {levelEditable && canMoveUp && (
                            <Button
                              icon="↑"
                              variant="primary"
                              outline
                              size="sm"
                              theme={theme}
                              aria-label="Переместить вверх"
                              disabled={mutating}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(item, level, 'up');
                              }}
                            />
                          )}
                          {levelEditable && canMoveDown && (
                            <Button
                              icon="↓"
                              variant="primary"
                              outline
                              size="sm"
                              theme={theme}
                              aria-label="Переместить вниз"
                              disabled={mutating}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(item, level, 'down');
                              }}
                            />
                          )}
                          {levelEditable && (
                            <Button
                              icon="✎"
                              variant="primary"
                              outline
                              size="sm"
                              theme={theme}
                              aria-label="Редактировать"
                              disabled={mutating}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(item);
                              }}
                            />
                          )}
                          {levelDeletable && (
                            <Button
                              icon="✕"
                              variant="danger"
                              outline
                              size="sm"
                              theme={theme}
                              aria-label="Удалить"
                              disabled={mutating}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingItem(item);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {levelCreatable && (
                <Button
                  icon="＋"
                  variant="primary"
                  size="sm"
                  theme={theme}
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={loading || mutating}
                  onClick={() => setAddLevel(level)}
                >
                  Добавить
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Добавление */}
      <DirectoryFormModal
        theme={theme}
        isOpen={addLevel !== null}
        onClose={() => setAddLevel(null)}
        onSave={(data) =>
          addLevel === null ? Promise.resolve(false) : addItem(addLevel, data)
        }
        title={
          addLevel === 0 ? 'Добавить корневой справочник' : 'Добавить элемент'
        }
        okText="Добавить"
        showTypeSelector={addLevel !== 0 && addLevel !== null}
        initialType={addLevel === 0 ? 'root' : getLastType()}
        directoryTypes={directoryTypes}
      />

      {/* Редактирование */}
      <DirectoryFormModal
        theme={theme}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(data) =>
          editingItem
            ? editItem(editingItem.id, data)
            : Promise.resolve(false)
        }
        title="Редактировать"
        okText="Сохранить"
        showTypeSelector={editingItem?.type !== 'root'}
        initialName={editingItem?.name || ''}
        initialType={editingItem?.type || ''}
        directoryTypes={directoryTypes}
      />

      {/* Удаление */}
      <Modal
        theme={theme}
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onOk={handleDeleteConfirm}
        title="Подтверждение удаления"
        okText="Удалить"
        cancelText="Отмена"
        width={400}
        columns={1}
        rows={1}
        canSubmit={!mutating}
        fields={[
          {
            row: 0,
            col: 0,
            content: (
              <div
                style={{
                  color: theme.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Удалить элемент <strong>{deletingItem?.name}</strong>?
                <br />
                <span style={{ color: theme.danger, fontSize: 13 }}>
                  Все дочерние элементы также будут удалены.
                </span>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}