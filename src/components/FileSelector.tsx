// FileSelector.tsx — drag&drop зона выбора файлов со списком и валидацией размера.
import { useState, useRef } from 'react';
import type { Theme } from '../themes/theme';
import { IcoFile, IcoX } from './icons';
import { IconActionButton } from './field';

export interface FileSelectorProps {
  /** Заголовок зоны. */
  label: string;
  /** Тема оформления. */
  theme: Theme;
  /**Accept-фильтр (например '.pdf,image/*'). */
  accept?: string;
  /** Разрешить несколько файлов. */
  multiple?: boolean;
  /** Лимит размера одного файла, МБ. */
  maxSizeMb?: number;
  /** Колбэк со всем текущим списком файлов. */
  onFiles?: (files: File[]) => void;
  /** Внешняя ошибка. */
  error?: string;
  /** Блокировка. */
  disabled?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

/** Зона загрузки файлов: клик, drag&drop, клавиатура; список с удалением. */
export default function FileSelector({
  label, theme: t, accept, multiple = false, maxSizeMb, onFiles,
  error: externalError, disabled = false,
}: FileSelectorProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const error = externalError || sizeError;

  const processFiles = (incoming: FileList | null) => {
    if (disabled || !incoming) return;
    const arr = Array.from(incoming);
    if (maxSizeMb && arr.some((f) => f.size > maxSizeMb * 1024 * 1024)) {
      setSizeError(`Файл превышает ${maxSizeMb} МБ`);
      return;
    }
    setSizeError('');
    const next = multiple ? [...files, ...arr] : arr;
    setFiles(next);
    onFiles?.(next);
  };
  const removeFile = (i: number) => {
    if (disabled) return;
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles?.(next);
  };
  const openDialog = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div style={{ width: '100%', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder, marginBottom: 10 }}>
        {label}
      </div>
      <div
        role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
        aria-label={`${label}: загрузить файл`}
        onClick={openDialog}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDialog(); } }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onDragOver={(e) => { if (!disabled) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => { if (!disabled) setDragging(false); }}
        onDrop={(e) => { if (!disabled) { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); } }}
        style={{
          border: `1.5px dashed ${error ? t.danger : dragging ? t.accent : t.border}`,
          borderRadius: 12, padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragging ? `color-mix(in srgb, ${t.accent} 5%, transparent)` : t.bg,
          transition: 'border-color 0.2s ease, background 0.2s ease',
          pointerEvents: disabled ? 'none' : 'auto', touchAction: 'manipulation',
          outline: 'none', boxShadow: focused ? `0 0 0 3px ${t.accentGlow}` : 'none',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `color-mix(in srgb, ${t.accent} 10%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent,
        }}>
          <IcoFile type="file" s={22} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: t.text, fontWeight: 500 }}>
            Перетащите файл{multiple ? 'ы' : ''} или <span style={{ color: t.accent }}>выберите</span>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: t.placeholder }}>
            {accept ? accept.replace(/,/g, ', ') : 'Любой формат'}{maxSizeMb ? ` · до ${maxSizeMb} МБ` : ''}
          </p>
        </div>
        <input
          ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, background: t.bg,
              border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 12px',
            }}>
              <div style={{ color: t.accent, flexShrink: 0 }}>
                <IcoFile type={f.type.startsWith('image/') ? 'image' : f.type === 'application/pdf' ? 'pdf' : 'file'} s={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: t.placeholder }}>{formatSize(f.size)}</div>
              </div>
              <IconActionButton onClick={() => removeFile(i)} t={t} disabled={disabled} ariaLabel={`Удалить ${f.name}`}>
                <IcoX s={14} />
              </IconActionButton>
            </div>
          ))}
        </div>
      )}
      {error && <p style={{ margin: '6px 0 0 0', fontSize: 12, color: t.danger }}>{error}</p>}
    </div>
  );
}