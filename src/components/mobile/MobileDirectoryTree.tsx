import React, { useState, useEffect, useCallback } from 'react';
import type { Theme } from '../../themes/theme';
import { Button } from '../../index';
import Modal from '../Modal';
import TextInput from '../inputs/TextInput';
import SearchableSelect from '../inputs/SearchableSelect';
import type { DirectoryApi, DirectoryItem } from '../desktop/DirectoryTree';
import { IcoChevronLeft, IcoChevronRight } from '../icons';

export interface MobileDirectoryTreeProps {
  theme: Theme;
  isAuthenticated: boolean;
  api: DirectoryApi;
  directoryTypes: { value: string; label: string }[];
  typeLabels: Record<string, string>;
  storageKey?: string;
}

export default function MobileDirectoryTree({
  theme: t,
  isAuthenticated,
  api,
  directoryTypes,
  typeLabels,
  storageKey = 'last_directory_type',
}: MobileDirectoryTreeProps) {
  // itemsByLevel[0] — корни; itemsByLevel[N] — дети выбранного на уровне N-1
  const [itemsByLevel, setItemsByLevel] = useState<Record<number, DirectoryItem[]>>({});
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<DirectoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DirectoryItem | null>(null);

  const currentLevel = selectedPath.length;

  const getLastType = () =>
    localStorage.getItem(storageKey) || directoryTypes[0]?.value || '';
  const setLastType = (type: string) => localStorage.setItem(storageKey, type);

  const loadRoots = useCallback(async () => {
    setLoading(true);
    try {
      const roots = await api.getRoots();
      setItemsByLevel({ 0: roots.map((r) => ({ ...r, type: 'root' })) });
      setSelectedPath([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadChildren = useCallback(
    async (parentId: number, level: number) => {
      const children = await api.getChildren(parentId);
      setItemsByLevel((prev) => ({ ...prev, [level]: children }));
    },
    [api]
  );

  useEffect(() => {
    loadRoots();
  }, [loadRoots]);

  const drillInto = async (item: DirectoryItem, level: number) => {
    const newPath = [...selectedPath.slice(0, level), item.id];
    setSelectedPath(newPath);
    await loadChildren(item.id, level + 1);
    // Чистим уровни глубже
    setItemsByLevel((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (Number(k) > level + 1) delete next[Number(k)];
      }
      return next;
    });
  };

  const goBackTo = (level: number) => {
    setSelectedPath(selectedPath.slice(0, level));
  };

  // ── CRUD ───────────────────────────────────────────

  const handleAdd = async (data: { name: string; type: string }) => {
    const parentId = selectedPath[currentLevel - 1] ?? null;
    const typeToUse = currentLevel === 0 ? 'root' : data.type;
    await api.createItem({ parent_id: parentId, name: data.name, type: typeToUse });
    if (currentLevel !== 0) setLastType(data.type);
    if (currentLevel === 0) await loadRoots();
    else await loadChildren(parentId!, currentLevel);
  };

  const handleEdit = async (data: { name: string; type: string }) => {
    if (!editItem) return;
    await api.updateItem(editItem.id, { name: data.name, type: data.type });
    setItemsByLevel((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[Number(k)] = next[Number(k)].map((el) =>
          el.id === editItem.id ? { ...el, name: data.name, type: data.type || el.type } : el
        );
      }
      return next;
    });
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await api.deleteItem(deleteItem.id);
    setItemsByLevel((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[Number(k)] = next[Number(k)].filter((el) => el.id !== deleteItem.id);
      }
      return next;
    });
    setDeleteItem(null);
  };

  const handleMove = async (item: DirectoryItem, direction: 'up' | 'down') => {
    await api.moveItem(item.id, direction);
    const level = currentLevel;
    if (level === 0) await loadRoots();
    else await loadChildren(selectedPath[level - 1], level);
  };

  // ── Хлебные крошки ─────────────────────────────────

  const findItem = (id: number): DirectoryItem | undefined => {
    for (const k of Object.keys(itemsByLevel)) {
      const found = itemsByLevel[Number(k)].find((i) => i.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const crumbs = selectedPath.map((id) => findItem(id)?.name ?? '…');
  const currentItems = itemsByLevel[currentLevel] ?? [];

  // ── Рендер ─────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: t.text }}>
      {/* Хлебные крошки + Back */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: t.bgSurface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          minHeight: 48,
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
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              minWidth: 32,
              minHeight: 32,
            }}
          >
            <IcoChevronLeft s={18} />
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
          <span
            onClick={() => goBackTo(0)}
            style={{
              color: currentLevel === 0 ? t.text : t.accent,
              cursor: currentLevel === 0 ? 'default' : 'pointer',
              fontWeight: currentLevel === 0 ? 600 : 400,
            }}
          >
            Справочники
          </span>
          {crumbs.map((name, i) => (
            <span key={i}>
              {' / '}
              <span
                onClick={() => goBackTo(i + 1)}
                style={{
                  color: i + 1 === currentLevel ? t.text : t.accent,
                  cursor: i + 1 === currentLevel ? 'default' : 'pointer',
                  fontWeight: i + 1 === currentLevel ? 600 : 400,
                }}
              >
                {name}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Список текущего уровня */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && currentItems.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: t.placeholder }}>
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
            Нет элементов. {isAuthenticated && 'Нажмите «Добавить».'}
          </div>
        )}

        {currentItems.map((item, idx) => {
          const hasChildren = item.type !== 'item' && item.type !== 'root' ? true : true;
          // Не знаем заранее, есть ли дети — показываем стрелку всегда, кроме type='item'
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
                onClick={() => canDrill && drillInto(item, currentLevel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: canDrill ? 'pointer' : 'default',
                  minHeight: 32,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
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
                    <span style={{ fontSize: 11, fontStyle: 'italic', color: t.textMuted }}>
                      {typeLabels[item.type] || item.type}
                    </span>
                  )}
                </div>
                {canDrill && (
                  <span style={{ color: t.iconColor, display: 'flex', flexShrink: 0 }}>
                    <IcoChevronRight s={18} />
                  </span>
                )}
              </div>

              {isAuthenticated && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    borderTop: `1px solid ${t.borderSubtle}`,
                    paddingTop: 10,
                  }}
                >
                  {canMoveUp && (
                    <Button
                      icon="↑"
                      variant="primary"
                      outline
                      size="md"
                      theme={t}
                      onClick={() => handleMove(item, 'up')}
                    />
                  )}
                  {canMoveDown && (
                    <Button
                      icon="↓"
                      variant="primary"
                      outline
                      size="md"
                      theme={t}
                      onClick={() => handleMove(item, 'down')}
                    />
                  )}
                  <Button
                    icon="✎"
                    variant="primary"
                    outline
                    size="md"
                    theme={t}
                    onClick={() => setEditItem(item)}
                  />
                  <Button
                    icon="✕"
                    variant="danger"
                    outline
                    size="md"
                    theme={t}
                    onClick={() => setDeleteItem(item)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Кнопка «Добавить» */}
      {isAuthenticated && (
        <Button
          icon="＋"
          variant="primary"
          size="md"
          theme={t}
          onClick={() => setAddOpen(true)}
        >
          {currentLevel === 0 ? 'Добавить справочник' : 'Добавить элемент'}
        </Button>
      )}

      {/* ── Модалка добавления ── */}
      <DirectoryFormModal
        t={t}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        title={currentLevel === 0 ? 'Новый справочник' : 'Новый элемент'}
        okText="Добавить"
        showTypeSelector={currentLevel !== 0}
        initialName=""
        initialType={currentLevel === 0 ? 'root' : getLastType()}
        directoryTypes={directoryTypes}
      />

      {/* ── Модалка редактирования ── */}
      <DirectoryFormModal
        t={t}
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onSave={handleEdit}
        title="Редактирование"
        okText="Сохранить"
        showTypeSelector={editItem?.type !== 'root'}
        initialName={editItem?.name ?? ''}
        initialType={editItem?.type ?? ''}
        directoryTypes={directoryTypes}
      />

      {/* ── Удаление ── */}
      <Modal
        theme={t}
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onOk={handleDelete}
        title="Удалить?"
        okText="Удалить"
        cancelText="Отмена"
        width={480}
        columns={1}
        rows={1}
        fields={[
          {
            row: 0,
            col: 0,
            content: (
              <div style={{ color: t.text, fontSize: 14 }}>
                Удалить <strong>{deleteItem?.name}</strong>?
                <div style={{ color: t.danger, fontSize: 12, marginTop: 6 }}>
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

// ── Внутренняя модалка формы ─────────────────────────

interface DirectoryFormModalProps {
  t: Theme;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; type: string }) => void | Promise<void>;
  title: string;
  okText: string;
  showTypeSelector: boolean;
  initialName: string;
  initialType: string;
  directoryTypes: { value: string; label: string }[];
}

function DirectoryFormModal({
  t,
  isOpen,
  onClose,
  onSave,
  title,
  okText,
  showTypeSelector,
  initialName,
  initialType,
  directoryTypes,
}: DirectoryFormModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setType(initialType);
    }
  }, [isOpen, initialName, initialType]);

  const canSubmit = !!name.trim() && (!showTypeSelector || !!type);

  const handleOk = () => {
    if (!canSubmit) return;
    onSave({ name: name.trim(), type: type || initialType });
    onClose();
  };

  return (
    <Modal
      theme={t}
      isOpen={isOpen}
      onClose={onClose}
      onOk={handleOk}
      title={title}
      okText={okText}
      cancelText="Отмена"
      width={520}
      columns={1}
      rows={showTypeSelector ? 2 : 1}
      canSubmit={canSubmit}
      fields={[
        {
          row: 0,
          col: 0,
          required: true,
          content: (
            <TextInput
              label="Название"
              theme={t}
              value={name}
              onChange={setName}
              inputType="text"
              autoFocus
            />
          ),
        },
        ...(showTypeSelector
          ? [
              {
                row: 1,
                col: 0,
                required: true,
                content: (
                  <SearchableSelect
                    label="Тип"
                    theme={t}
                    options={directoryTypes}
                    value={type}
                    onChange={setType}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
}