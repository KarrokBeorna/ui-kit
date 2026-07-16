import { useState, useRef } from 'react'
import type { Theme } from '../themes/themes'

interface FileSelectorProps {
  label: string
  theme: Theme
  accept?: string
  multiple?: boolean
  maxSizeMb?: number
  onFiles?: (files: File[]) => void
  error?: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

function FileIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/')
  const isPdf = type === 'application/pdf'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {isImage ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </>
      ) : isPdf ? (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M10 13h4M10 17h4M10 9h1" />
        </>
      ) : (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </>
      )}
    </svg>
  )
}

export default function FileSelector({
  label, theme: t, accept, multiple = false, maxSizeMb, onFiles, error: externalError,
}: FileSelectorProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [sizeError, setSizeError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const error = externalError || sizeError

  const processFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const arr = Array.from(incoming)
    if (maxSizeMb) {
      const oversized = arr.filter(f => f.size > maxSizeMb * 1024 * 1024)
      if (oversized.length) {
        setSizeError(`Файл превышает ${maxSizeMb} МБ`)
        return
      }
    }
    setSizeError('')
    const next = multiple ? [...files, ...arr] : arr
    setFiles(next)
    onFiles?.(next)
  }

  const removeFile = (i: number) => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    onFiles?.(next)
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder, marginBottom: 10 }}>
        {label}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }}
        style={{
          border: `1.5px dashed ${error ? '#ef4444' : dragging ? t.accent : t.border}`,
          borderRadius: 12,
          padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          background: dragging ? `${t.accent}0a` : t.inputBg,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${t.accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.accent, transition: 'background 0.2s',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: t.text, fontWeight: 500 }}>
            Перетащите файл{multiple ? 'ы' : ''} или{' '}
            <span style={{ color: t.accent }}>выберите</span>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: t.placeholder }}>
            {accept ? accept.replace(/,/g, ', ') : 'Любой формат'}
            {maxSizeMb ? ` · до ${maxSizeMb} МБ` : ''}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={e => processFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: t.surface ?? t.inputBg,
                border: `1px solid ${t.border}`,
                borderRadius: 8, padding: '8px 12px',
              }}
            >
              <div style={{ color: t.accent, flexShrink: 0 }}>
                <FileIcon type={f.type} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: t.placeholder }}>{formatSize(f.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: t.iconColor, padding: 4, borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
