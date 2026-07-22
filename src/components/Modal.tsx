import React, { useEffect } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';

interface ModalField {
  row: number;
  col: number;
  rowspan?: number;
  colspan?: number;
  required?: boolean;
  content: React.ReactNode;
}

interface ModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  onOk: () => void;
  title?: string;
  columns: number;
  rows: number;
  fields: ModalField[];
  okText?: string;
  cancelText?: string;
  width?: number | string;
  canSubmit?: boolean;
}

export default function Modal({
  theme: t,
  isOpen,
  onClose,
  onOk,
  title = 'Модальное окно',
  columns,
  rows,
  fields,
  okText = 'Ок',
  cancelText = 'Отмена',
  width = 640,
  canSubmit = true,
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grid: (React.ReactNode | null)[][] = Array.from({ length: rows }, () => Array(columns).fill(null));

  fields.forEach((field) => {
    const r = field.row;
    const c = field.col;
    if (r >= rows || c >= columns) return;
    let occupied = false;
    for (let dr = 0; dr < (field.rowspan || 1); dr++) {
      for (let dc = 0; dc < (field.colspan || 1); dc++) {
        if (grid[r + dr]?.[c + dc] !== null) occupied = true;
      }
    }
    if (!occupied) {
      for (let dr = 0; dr < (field.rowspan || 1); dr++) {
        for (let dc = 0; dc < (field.colspan || 1); dc++) {
          grid[r + dr][c + dc] = null;
        }
      }
      grid[r][c] = field.content;
    }
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: t.bgSurface,
          borderRadius: 16,
          width: typeof width === 'number' ? width : width,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: t.shadowLg,
          animation: 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
        }}
      >
        {/* Заголовок */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 600, color: t.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: t.iconColor,
              padding: 4,
              borderRadius: 6,
              transition: 'background 0.15s, color 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.iconColor; }}
          >
            <IcoX s={18} />
          </button>
        </div>

        {/* Содержимое со скроллом */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, auto)`,
              gap: 12,
              alignItems: 'start',
            }}
          >
            {grid.map((row, ri) =>
              row.map((cell, ci) => {
                const field = fields.find(f => f.row === ri && f.col === ci);
                const rowspan = field?.rowspan || 1;
                const colspan = field?.colspan || 1;
                if (cell === null) return null;
                return (
                  <div
                    key={`${ri}-${ci}`}
                    style={{
                      gridRow: `${ri + 1} / span ${rowspan}`,
                      gridColumn: `${ci + 1} / span ${colspan}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {field?.required && (
                      <span style={{ color: t.danger, fontSize: 14, fontWeight: 600, marginRight: 4 }}>*</span>
                    )}
                    {cell}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${t.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: 'transparent',
              color: t.textMuted,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
          >
            {cancelText}
          </button>
          <button
            onClick={onOk}
            disabled={!canSubmit}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: canSubmit ? t.accent : t.bgSubmit,
              color: canSubmit ? t.accentText : t.textMuted,
              fontSize: 14,
              fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              boxShadow: canSubmit ? `0 0 0 2px ${t.accentGlow}` : 'none',
              opacity: canSubmit ? 1 : 0.6,
            }}
            onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.opacity = '1'; }}
          >
            {okText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}