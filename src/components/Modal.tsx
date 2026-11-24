// Modal.tsx — модальное окно с сеткой полей, focus-trap и fullscreen на мобильном.
//
// ИЗМЕНЕНИЕ: поля поддерживают ACL. Поле с acl регистрируется в реестре ресурсов
// само; без права view — не рендерится, без права edit — видно, но заблокировано.
import React, { useEffect, useRef, useId } from 'react';
import type { Theme } from '../themes/theme';
import { IcoX } from './icons';
import { useResponsive } from '../context/AppContext';
import { useBodyScrollLock } from '../hooks';
import { useAcl, registerResource, Acl as AclField } from '../acl';

export interface ModalField {
  /** Строка сетки (0-based). */
  row: number;
  /** Колонка сетки (0-based). */
  col: number;
  /** Объединение строк. */
  rowspan?: number;
  /** Объединение колонок. */
  colspan?: number;
  /** Пометить обязательным (звёздочка). */
  required?: boolean;
  /** Содержимое ячейки. */
  content: React.ReactNode;
  /** Идентификатор ресурса ('user.password'). Нет права — поле скрыто. */
  acl?: string;
  /** Право редактирования. Нет права — поле видно, но заблокировано. */
  aclEdit?: string;
  /** Подпись поля для редактора ролей. */
  label?: string;
}

export interface ModalProps {
  /** Тема оформления. */
  theme: Theme;
  /** Открыта ли модалка. */
  isOpen: boolean;
  /** Закрытие (крестик / Escape / Отмена). */
  onClose: () => void;
  /** Подтверждение (кнопка Ok / Enter). */
  onOk: () => void;
  /** Заголовок. @default 'Модальное окно' */
  title?: string;
  /** Колонок сетки полей. */
  columns: number;
  /** Строк сетки полей. */
  rows: number;
  /** Поля. */
  fields: ModalField[];
  /** Текст кнопки подтверждения. @default 'Ок' */
  okText?: string;
  /** Текст кнопки отмены. @default 'Отмена' */
  cancelText?: string;
  /** Ширина (px или CSS). @default 640 */
  width?: number | string;
  /** Высота (px или CSS). @default 640 */
  height?: number | string;
  /** Доступность кнопки Ok. @default true */
  canSubmit?: boolean;
  /** Выравнивание по вертикали для каждой строки. */
  rowAlign?: React.CSSProperties['alignItems'][];
  /** Fullscreen (по умолчанию — на мобильном). */
  fullscreen?: boolean;
  /** Показывать «Отмена». @default true */
  showCancel?: boolean;
  /** Показывать кнопку подтверждения. @default true */
  showOk?: boolean;
}

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Модальное окно. Enter подтверждает (кроме textarea/кнопок/дропдаунов), Escape закрывает. */
export default function Modal({
  theme: t, isOpen, onClose, onOk, title = 'Модальное окно',
  columns, rows, fields, okText = 'Ок', cancelText = 'Отмена', width = 640,
  canSubmit = true, rowAlign, fullscreen: fullscreenProp, showCancel = true, showOk = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isMobile } = useResponsive();
  const { can } = useAcl();
  const fullscreen = fullscreenProp ?? isMobile;
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  useBodyScrollLock(isOpen);

  const isTopmost = () => {
    const all = document.querySelectorAll('[data-modal="true"]');
    return all[all.length - 1] === modalRef.current;
  };

  // Ресурсы полей объявляются даже у закрытой модалки — редактор ролей видит их сразу.
  useEffect(() => {
    for (const field of fields) {
      if (field.acl) registerResource({ id: field.acl, kind: 'field', label: field.label || field.acl });
      if (field.aclEdit && field.aclEdit !== field.acl) {
        registerResource({ id: field.aclEdit, kind: 'field', label: field.label || field.aclEdit });
      }
    }
  }, [fields]);

  // Focus-trap + возврат фокуса при закрытии.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = modalRef.current;
    const list = () => el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null) : [];
    const raf = requestAnimationFrame(() => list()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      const f = list();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [isOpen]);

  // Enter → onOk.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !canSubmit || !showOk || !isTopmost()) return;
      const target = e.target as HTMLElement;
      if (!modalRef.current?.contains(target)) return;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT' || target.isContentEditable) return;
      if (target.closest('[role="listbox"],[role="combobox"],[role="menu"]')) return;
      e.preventDefault();
      onOk();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onOk, canSubmit, showOk]);

  if (!isOpen) return null;

  // Видимость по ACL и блокировка редактирования.
  const visibleFields = fields.filter((field) => can(field.acl));
  const contentOf = (field: ModalField) => field.aclEdit
    ? <AclField id={field.acl ?? ''} edit={field.aclEdit} label={field.label}>{field.content}</AclField>
    : field.content;

  // Раскладка полей с учётом span и коллизий.
  const grid: (React.ReactNode | null)[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
  const occupied: boolean[][] = Array.from({ length: rows }, () => Array(columns).fill(false));
  const placedFields = new Map<string, ModalField>();

  visibleFields.forEach((field) => {
    const { row: r, col: c } = field;
    if (r < 0 || c < 0 || r >= rows || c >= columns) return;
    const spanR = Math.min(field.rowspan || 1, rows - r);
    const spanC = Math.min(field.colspan || 1, columns - c);
    for (let dr = 0; dr < spanR; dr++) for (let dc = 0; dc < spanC; dc++) if (occupied[r + dr][c + dc]) return;
    grid[r][c] = contentOf(field);
    placedFields.set(`${r}-${c}`, field);
    for (let dr = 0; dr < spanR; dr++) for (let dc = 0; dc < spanC; dc++) occupied[r + dr][c + dc] = true;
  });

  const effectiveColumns = fullscreen ? 1 : columns;
  const gridToRender = fullscreen ? visibleFields.map((f) => [contentOf(f)]) : grid;
  const showFooter = showOk || showCancel;

  return (
    <div
      ref={modalRef} data-modal="true" role="dialog" aria-modal="true" aria-labelledby={titleId}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: fullscreen ? 'stretch' : 'center', justifyContent: 'center',
        animation: 'modalFadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: t.bgSurface, borderRadius: fullscreen ? 0 : 16,
        width: fullscreen ? '100vw' : width, maxWidth: fullscreen ? '100vw' : 'calc(100vw - 40px)',
        maxHeight: fullscreen ? '100dvh' : 'calc(100vh - 40px)', height: fullscreen ? '100dvh' : undefined,
        display: 'flex', flexDirection: 'column', boxShadow: t.shadowLg,
        animation: fullscreen ? 'modalFadeIn 0.2s ease' : 'modalScaleIn 0.25s cubic-bezier(0.4,0,0.2,1)',
        border: fullscreen ? 'none' : `1px solid ${t.border}`, overflow: 'hidden',
        paddingTop: fullscreen ? 'env(safe-area-inset-top, 0px)' : 0,
        paddingBottom: fullscreen ? 'env(safe-area-inset-bottom, 0px)' : 0,
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <span id={titleId} style={{ fontSize: 18, fontWeight: 600, color: t.text }}>{title}</span>
          <button type="button" aria-label="Закрыть" onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', color: t.iconColor,
              padding: 4, borderRadius: 6, transition: 'background 0.15s, color 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40, minHeight: 40,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.iconColor; }}
          >
            <IcoX s={18} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
            gridTemplateRows: `repeat(${gridToRender.length}, auto)`, gap: 12,
          }}>
            {gridToRender.map((row, ri) =>
              row.map((cell, ci) => {
                if (cell === null || cell === undefined) return null;
                const field = fullscreen ? visibleFields[ri] : placedFields.get(`${ri}-${ci}`);
                const rowspan = fullscreen ? 1 : field?.rowspan || 1;
                const colspan = fullscreen ? 1 : field?.colspan || 1;
                return (
                  <div key={`${ri}-${ci}`} style={{
                    gridRow: `${ri + 1} / span ${rowspan}`, gridColumn: `${ci + 1} / span ${colspan}`,
                    display: 'flex', flexDirection: 'column',
                    alignSelf: fullscreen ? 'stretch' : rowAlign?.[ri] ?? 'end',
                  }}>
                    {field?.required && <span style={{ color: t.danger, fontSize: 12, fontWeight: 600, marginRight: 4 }}>*</span>}
                    {cell}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {showFooter && (
          <div style={{
            padding: '12px 20px', borderTop: `1px solid ${t.border}`,
            display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
            flexWrap: fullscreen ? 'wrap' : 'nowrap',
          }}>
            {showCancel && (
              <button type="button" onClick={onClose}
                style={{
                  padding: '8px 20px', minHeight: fullscreen ? 48 : undefined, flex: fullscreen ? '1 1 auto' : undefined,
                  borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.textMuted, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
              >
                {cancelText}
              </button>
            )}
            {showOk && (
              <button type="button" onClick={onOk} disabled={!canSubmit}
                style={{
                  padding: '8px 24px', minHeight: fullscreen ? 48 : undefined, flex: fullscreen ? '1 1 auto' : undefined,
                  borderRadius: 8, border: 'none',
                  background: canSubmit ? t.accent : t.bgSubmit,
                  color: canSubmit ? t.accentText : t.textMuted,
                  fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                  cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s',
                  boxShadow: canSubmit ? `0 0 0 2px ${t.accentGlow}` : 'none', opacity: canSubmit ? 1 : 0.6,
                }}
                onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.opacity = '1'; }}
              >
                {okText}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalScaleIn { from { transform: scale(0.94); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [data-modal="true"], [data-modal="true"] > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}