import React, { useEffect, useRef } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';
import { useResponsive } from '../context/ResponsiveContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  rowAlign?: React.CSSProperties['alignItems'][];
  /** Принудительно полноэкранный режим независимо от размера экрана */
  fullscreen?: boolean;
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
  rowAlign,
  fullscreen: fullscreenProp,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  const fullscreen = fullscreenProp ?? isMobile;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!modalRef.current || !modalRef.current.contains(target)) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        onOk();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, onOk, canSubmit]);

  if (!isOpen) return null;

  const grid: (React.ReactNode | null)[][] = Array.from({ length: rows }, () =>
    Array(columns).fill(null)
  );

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

  // На мобиле — 1 колонка в любом случае, на десктопе — как просили
  const effectiveColumns = fullscreen ? 1 : columns;
  const effectiveRows = fullscreen ? fields.length : rows;

  // Пере-собираем grid для мобильного режима, если разошлось
  const gridToRender = fullscreen
    ? fields.map((f) => [f.content])
    : grid;

  return (
    <div
      ref={modalRef}
      data-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: fullscreen ? 'stretch' : 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: t.bgSurface,
          borderRadius: fullscreen ? 0 : 16,
          width: fullscreen ? '100vw' : (typeof width === 'number' ? width : width),
          maxWidth: fullscreen ? '100vw' : 'calc(100vw - 40px)',
          maxHeight: fullscreen ? '100dvh' : 'calc(100vh - 40px)',
          height: fullscreen ? '100dvh' : undefined,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: t.shadowLg,
          animation: 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          border: fullscreen ? 'none' : `1px solid ${t.border}`,
          overflow: 'hidden',
          paddingTop: fullscreen ? 'env(safe-area-inset-top, 0px)' : 0,
          paddingBottom: fullscreen ? 'env(safe-area-inset-bottom, 0px)' : 0,
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
          <span style={{ fontSize: 18, fontWeight: 600, color: t.text }}>
            {title}
          </span>
          <button
            type="button"
            aria-label="Закрыть"
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
              minWidth: 40,
              minHeight: 40,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.navHoverBg;
              e.currentTarget.style.color = t.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = t.iconColor;
            }}
          >
            <IcoX s={18} />
          </button>
        </div>

        {/* Содержимое */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
              gridTemplateRows: `repeat(${effectiveRows}, auto)`,
              gap: 12,
            }}
          >
            {gridToRender.map((row, ri) =>
              row.map((cell, ci) => {
                const field = fullscreen
                  ? fields[ri]
                  : fields.find((f) => f.row === ri && f.col === ci);
                const rowspan = field?.rowspan || 1;
                const colspan = fullscreen ? 1 : field?.colspan || 1;
                if (cell === null || cell === undefined) return null;

                const alignSelf = fullscreen
                  ? 'stretch'
                  : rowAlign?.[ri] ?? 'end';

                return (
                  <div
                    key={`${ri}-${ci}`}
                    style={{
                      gridRow: `${ri + 1} / span ${rowspan}`,
                      gridColumn: `${ci + 1} / span ${colspan}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf,
                    }}
                  >
                    {field?.required && (
                      <span
                        style={{
                          color: t.danger,
                          fontSize: 12,
                          fontWeight: 600,
                          marginRight: 4,
                        }}
                      >
                        *
                      </span>
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
            flexWrap: fullscreen ? 'wrap' : 'nowrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              minHeight: fullscreen ? 48 : undefined,
              flex: fullscreen ? '1 1 auto' : undefined,
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: 'transparent',
              color: t.textMuted,
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.navHoverBg;
              e.currentTarget.style.color = t.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = t.textMuted;
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onOk}
            disabled={!canSubmit}
            style={{
              padding: '8px 24px',
              minHeight: fullscreen ? 48 : undefined,
              flex: fullscreen ? '1 1 auto' : undefined,
              borderRadius: 8,
              border: 'none',
              background: canSubmit ? t.accent : t.bgSubmit,
              color: canSubmit ? t.accentText : t.textMuted,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              boxShadow: canSubmit ? `0 0 0 2px ${t.accentGlow}` : 'none',
              opacity: canSubmit ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (canSubmit) e.currentTarget.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              if (canSubmit) e.currentTarget.style.opacity = '1';
            }}
          >
            {okText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.94); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}