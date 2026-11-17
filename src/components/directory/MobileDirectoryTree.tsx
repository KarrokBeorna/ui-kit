import React, { useState } from 'react';
import type { Theme } from '../../themes/theme';
import { Button } from '../../index';
import Modal from '../Modal';
import { useDirectoryTree } from './useDirectoryTree';
import { DirectoryFormModal } from './DirectoryFormModal';
import type { DirectoryItem } from './types';
import { IcoChevronLeft, IcoChevronRight } from '../icons';

export interface MobileDirectoryTreeProps {
  theme: Theme;
  isAuthenticated: boolean;
  api: import('./types').DirectoryApi;
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

/** Минимальный touch-target по HIG/Material */
const TOUCH = 44;

export default function MobileDirectoryTree({
  theme: t,
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
}: MobileDirectoryTreeProps) {
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
    autoSelectFirstRoot: false,
  });

  const {
    itemsByLevel,
    selectedPath,
    loading,
    mutating,
    itemById,
    canCreate,
    canEdit,
    canDelete,
    selectItem,
    goBackTo,
    addItem,
    editItem,
    deleteItem,
    moveItem,
    getLastType,
  } = tree;

  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DirectoryItem | null>(null);

  const currentLevel = selectedPath.length;
  const currentItems = itemsByLevel[currentLevel] ?? [];
  const crumbs = selectedPath.map((id) => itemById.get(id)?.name ?? '…');

  const levelCreatable = canCreate(currentLevel);
  const levelEditable = canEdit(currentLevel);
  const levelDeletable = canDelete(currentLevel);
  const showActions = levelEditable || levelDeletable;

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    const ok = await deleteItem(deletingItem.id);
    if (ok) setDeletingItem(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        color: t.text,
      }}
    >
      {/* Хлебные крошки + Back */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          minHeight: TOUCH + 4,
        }}
      >
        {currentLevel > 0 && (
          <button
            type="button"
            onClick={() => goBackTo(currentLevel - 1)}
            aria-label="Назад"
            style={{
              background: 'transparent',
              border: 'none',
              color: t.accent,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: TOUCH,
              minHeight: TOUCH,
              flexShrink: 0,
            }}
          >
            <IcoChevronLeft s={20} />
          </button>
        )}
        <div
          style={{
            flex: 1,
            fontSize: 13,
            color: t.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <button
            type="button"
            onClick={() => currentLevel !== 0 && goBackTo(0)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 2px',
              minHeight: TOUCH,
              color: currentLevel === 0 ? t.text : t.accent,
              cursor: currentLevel === 0 ? 'default' : 'pointer',
              fontWeight: currentLevel === 0 ? 600 : 400,
              fontSize: 13,
            }}
          >
            Справочники
          </button>
          {crumbs.map((name, i) => {
            const isLast = i + 1 === currentLevel;
            return (
              <span key={selectedPath[i]}>
                {' / '}
                <button
                  type="button"
                  onClick={() => !isLast && goBackTo(i + 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 2px',
                    minHeight: TOUCH,
                    color: isLast ? t.text : t.accent,
                    cursor: isLast ? 'default' : 'pointer',
                    fontWeight: isLast ? 600 : 400,
                    fontSize: 13,
                  }}
                >
                  {name}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Список текущего уровня */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && currentItems.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: t.placeholder,
            }}
          >
            Загрузка…
          </div>
        )}

        {!loading && currentItems.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: t.placeholder,
              background: t.bgSurface,
              border: `1px dashed ${t.border}`,
              borderRadius: 12,
              fontSize: 14,
            }}
          >
            Нет элементов.{' '}
            {levelCreatable && 'Нажмите «Добавить».'}
          </div>
        )}

        {currentItems.map((item, idx) => {
          // Эвристика: у type 'item' детей быть не может
          const canDrill = item.type !== 'item';
          const canMoveUp = idx > 0;
          const canMoveDown = idx < currentItems.length - 1;

          return (
            <div
              key={item.id}
              style={{
                background: t.bgSurface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                onClick={() => canDrill && selectItem(item, currentLevel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: canDrill ? 'pointer' : 'default',
                  minHeight: TOUCH,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  {currentLevel > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontStyle: 'italic',
                        color: t.textMuted,
                      }}
                    >
                      {typeLabels[item.type] || item.type}
                    </span>
                  )}
                </div>
                {canDrill && (
                  <span
                    style={{
                      color: t.iconColor,
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    <IcoChevronRight s={18} />
                  </span>
                )}
              </div>

              {showActions && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    borderTop: `1px solid ${t.borderSubtle}`,
                    paddingTop: 10,
                  }}
                >
                  {levelEditable && canMoveUp && (
                    <Button
                      icon="↑"
                      variant="primary"
                      outline
                      size="md"
                      theme={t}
                      disabled={mutating}
                      aria-label="Переместить вверх"
                      onClick={() => moveItem(item, currentLevel, 'up')}
                    />
                  )}
                  {levelEditable && canMoveDown && (
                    <Button
                      icon="↓"
                      variant="primary"
                      outline
                      size="md"
                      theme={t}
                      disabled={mutating}
                      aria-label="Переместить вниз"
                      onClick={() => moveItem(item, currentLevel, 'down')}
                    />
                  )}
                  {levelEditable && (
                    <Button
                      icon="✎"
                      variant="primary"
                      outline
                      size="md"
                      theme={t}
                      disabled={mutating}
                      aria-label="Редактировать"
                      onClick={() => setEditingItem(item)}
                    />
                  )}
                  {levelDeletable && (
                    <Button
                      icon="✕"
                      variant="danger"
                      outline
                      size="md"
                      theme={t}
                      disabled={mutating}
                      aria-label="Удалить"
                      onClick={() => setDeletingItem(item)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Добавление */}
      {levelCreatable && (
        <Button
          icon="＋"
          variant="primary"
          size="md"
          theme={t}
          disabled={loading || mutating}
          onClick={() => setAddOpen(true)}
        >
          {currentLevel === 0
            ? 'Добавить справочник'
            : 'Добавить элемент'}
        </Button>
      )}

      {/* Модалка добавления */}
      <DirectoryFormModal
        theme={t}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addItem(currentLevel, data)}
        title={
          currentLevel === 0 ? 'Новый справочник' : 'Новый элемент'
        }
        okText="Добавить"
        showTypeSelector={currentLevel !== 0}
        initialType={currentLevel === 0 ? 'root' : getLastType()}
        directoryTypes={directoryTypes}
      />

      {/* Модалка редактирования */}
      <DirectoryFormModal
        theme={t}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(data) =>
          editingItem
            ? editItem(editingItem.id, data)
            : Promise.resolve(false)
        }
        title="Редактирование"
        okText="Сохранить"
        showTypeSelector={editingItem?.type !== 'root'}
        initialName={editingItem?.name ?? ''}
        initialType={editingItem?.type ?? ''}
        directoryTypes={directoryTypes}
      />

      {/* Удаление */}
      <Modal
        theme={t}
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onOk={handleDeleteConfirm}
        title="Удалить?"
        okText="Удалить"
        cancelText="Отмена"
        width={480}
        columns={1}
        rows={1}
        canSubmit={!mutating}
        fields={[
          {
            row: 0,
            col: 0,
            content: (
              <div style={{ color: t.text, fontSize: 14 }}>
                Удалить <strong>{deletingItem?.name}</strong>?
                <div
                  style={{
                    color: t.danger,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Все дочерние элементы также будут удалены.
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}