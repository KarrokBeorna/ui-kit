import React, { useEffect, useState } from 'react';
import type { Theme } from '../../themes/theme';
import Modal from '../Modal';
import TextInput from '../inputs/TextInput';
import SearchableSelect from '../inputs/SearchableSelect';

export interface DirectoryFormModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  /** true — можно закрывать; false — оставить открытой (показали ошибку). */
  onSave: (data: { name: string; type: string }) => Promise<boolean>;
  title: string;
  okText: string;
  showTypeSelector: boolean;
  initialName?: string;
  initialType?: string;
  directoryTypes: { value: string; label: string }[];
}

export function DirectoryFormModal({
  theme,
  isOpen,
  onClose,
  onSave,
  title,
  okText,
  showTypeSelector,
  initialName = '',
  initialType = '',
  directoryTypes,
}: DirectoryFormModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [nameError, setNameError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setType(initialType);
      setNameError('');
      setTypeError('');
      setSaving(false);
    }
  }, [isOpen, initialName, initialType]);

  const handleSave = async () => {
    setNameError('');
    setTypeError('');

    let hasError = false;
    if (!name.trim()) {
      setNameError('Введите название');
      hasError = true;
    }
    if (showTypeSelector && !type) {
      setTypeError('Выберите тип');
      hasError = true;
    }
    if (hasError) return;

    setSaving(true);
    try {
      const ok = await onSave({ name: name.trim(), type: type || initialType });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !saving && !!name.trim() && (!showTypeSelector || !!type);

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      onClose={onClose}
      onOk={handleSave}
      title={title}
      okText={okText}
      cancelText="Отмена"
      width={500}
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
              theme={theme}
              value={name}
              onChange={setName}
              inputType="text"
              autoFocus
              error={nameError || undefined}
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
                    theme={theme}
                    options={directoryTypes}
                    value={type}
                    onChange={setType}
                    error={typeError || undefined}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
}