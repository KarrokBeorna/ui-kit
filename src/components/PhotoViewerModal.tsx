// PhotoViewerModal.tsx - UI Kit
// PhotoViewerModal.tsx — просмотр фотографий записи.
//
//  • центр — большое изображение (contain), клик по нему открывает
//    ПОЛНОРАЗМЕРНЫЙ просмотр (оригинальное разрешение, скролл/панорама);
//  • низ — карусель-лента миниатюр с переключением, счётчик и стрелки;
//  • клавиатура: ←/→ — переключение, Escape — закрыть fullscreen/окно;
//  • опциональное удаление (onDelete) — право проверяет вызывающая сторона.
//
// ИЗМЕНЕНИЕ: на мобильном кнопка удаления — компактная icon-only корзина
// (без слова «Удалить»), во время удаления — спиннер. Десктоп не изменён.
// Заголовок шапки обрезается многоточием и не выталкивает кнопки на узком экране.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '../themes/theme';
import { useBodyScrollLock, useStyleTag } from '../hooks';
import { useResponsive } from '../context/AppContext';
import { formatDateTime } from '../utils';
import LoadingOverlay from './LoadingOverlay';
import { IcoChevronLeft, IcoChevronRight, IcoX, IcoTrash } from './icons';

/** Фотография для просмотра. url — оригинал; thumbUrl — миниатюра (если есть). */
export interface ViewerPhoto {
  id: string | number;
  url: string;
  thumbUrl?: string;
  name?: string;
  createdAt?: string | null;
}

export interface PhotoViewerModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  photos: ViewerPhoto[];
  /** Индекс начального фото. @default 0 */
  initialIndex?: number;
  /** Заголовок. @default 'Фотографии' */
  title?: string;
  /** Данные загружаются. */
  loading?: boolean;
  /** Удаление текущего фото (кнопка показывается только при наличии пропа). */
  onDelete?: (photo: ViewerPhoto) => void | Promise<void>;
}

const THUMB = 72;

const PHOTO_CSS = `
@keyframes kbsPhotoSpin { to { transform: rotate(360deg); } }
.kbs-photo-spinner { animation: kbsPhotoSpin 0.7s linear infinite; }
@media (prefers-reduced-motion: reduce) { .kbs-photo-spinner { animation-duration: 1.6s; } }
`;

/** Модалка просмотра фото: карусель миниатюр + большое изображение + fullscreen. */
export default function PhotoViewerModal({
  theme: t, isOpen, onClose, photos, initialIndex = 0,
  title = 'Фотографии', loading = false, onDelete,
}: PhotoViewerModalProps) {
  useStyleTag('kbs-photo-viewer-css', PHOTO_CSS);
  const { isMobile } = useResponsive();
  const [idx, setIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  useBodyScrollLock(isOpen);

  // Сброс при открытии / смене набора фото.
  useEffect(() => {
    if (!isOpen) { setFullscreen(false); setDeleting(false); return; }
    setIdx(Math.max(0, Math.min(initialIndex, photos.length - 1)));
  }, [isOpen, initialIndex, photos.length]);

  const count = photos.length;
  const current = count > 0 ? photos[Math.min(idx, count - 1)] : null;

  const go = useCallback((dir: -1 | 1) => {
    setIdx((i) => (count > 0 ? (i + dir + count) % count : 0));
  }, [count]);

  // Клавиатура: Escape закрывает сначала fullscreen, затем окно.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (fullscreen) setFullscreen(false); else onCloseRef.current();
        return;
      }
      if (fullscreen) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isOpen, fullscreen, go]);

  // Активная миниатюра всегда в зоне видимости ленты.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [idx, isOpen]);

  const handleDelete = useCallback(async () => {
    if (!current || !onDelete || deleting) return;
    setDeleting(true);
    try { await onDelete(current); } finally { setDeleting(false); }
  }, [current, onDelete, deleting]);

  if (!isOpen) return null;

  const navBtn = (dir: -1 | 1, label: string): React.ReactNode => (
    <button type="button" aria-label={label} onClick={() => go(dir)} disabled={count <= 1}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [dir === -1 ? 'left' : 'right']: 10, zIndex: 2,
        width: 40, height: 40, borderRadius: '50%', border: `1px solid ${t.border}`,
        background: t.bgSurface, color: t.text, cursor: count <= 1 ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: count <= 1 ? 0.3 : 0.9, boxShadow: t.shadow, touchAction: 'manipulation',
      } as React.CSSProperties}>
      {dir === -1 ? <IcoChevronLeft s={18} /> : <IcoChevronRight s={18} />}
    </button>
  );

  const caption = current
    ? [current.name, current.createdAt ? formatDateTime(current.createdAt) : null].filter(Boolean).join(' · ')
    : '';

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'modalFadeIn 0.2s ease',
      }}>
      <div style={{
        width: 'min(1080px, calc(100vw - 32px))', height: 'min(86dvh, 820px)',
        background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 16,
        boxShadow: t.shadowLg, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'modalScaleIn 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Шапка */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            fontSize: 16, fontWeight: 600, color: t.text,
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</span>
          {count > 0 && (
            <span style={{ fontSize: 13, color: t.textMuted, flexShrink: 0 }}>{Math.min(idx, count - 1) + 1} / {count}</span>
          )}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {onDelete && current && (
              isMobile ? (
                /* Мобильный: только иконка корзины, без текста. */
                <button type="button" onClick={handleDelete} disabled={deleting}
                  aria-label="Удалить фото" title="Удалить фото" aria-busy={deleting}
                  style={{
                    width: 36, height: 36, padding: 0, borderRadius: 8,
                    border: `1px solid ${t.danger}`, background: 'transparent', color: t.danger,
                    cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.55 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    touchAction: 'manipulation', transition: 'opacity 0.15s',
                  }}>
                  {deleting ? (
                    <span className="kbs-photo-spinner" style={{
                      display: 'inline-block', width: 14, height: 14,
                      border: `2px solid ${t.danger}40`, borderTopColor: t.danger, borderRadius: '50%',
                    }} />
                  ) : (
                    <IcoTrash s={16} />
                  )}
                </button>
              ) : (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  aria-label="Удалить фото" title="Удалить фото"
                  style={{
                    padding: '6px 12px', minHeight: 36, borderRadius: 8, fontSize: 13,
                    border: `1px solid ${t.danger}`, background: 'transparent', color: t.danger,
                    cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1,
                    fontFamily: 'inherit', touchAction: 'manipulation',
                  }}>
                  {deleting ? 'Удаление…' : '✕ Удалить'}
                </button>
              )
            )}
            <button type="button" aria-label="Закрыть" onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent',
                color: t.iconColor, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
              <IcoX s={16} />
            </button>
          </div>
        </div>

        {/* Большое изображение */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', background: t.bg }}>
          {current ? (
            <>
              {navBtn(-1, 'Предыдущее фото')}
              {navBtn(1, 'Следующее фото')}
              <img key={current.id} src={current.url} alt={current.name ?? 'Фото'}
                onClick={() => setFullscreen(true)}
                title="Открыть в полном размере"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain', display: 'block', cursor: 'zoom-in',
                  WebkitTapHighlightColor: 'transparent',
                }} />
              {caption && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, padding: '6px 14px',
                  fontSize: 12, color: t.textMuted, background: t.bgSurface,
                  borderTop: `1px solid ${t.borderSubtle}`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {caption}
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 14,
              }}>
                Нет фотографий
              </div>
            )
          )}
          <LoadingOverlay visible={loading} theme={t} borderRadius={0} />
        </div>

        {/* Карусель миниатюр */}
        {count > 0 && (
          <div ref={stripRef} style={{
            flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
            overflowX: 'auto', overscrollBehaviorX: 'contain',
            borderTop: `1px solid ${t.border}`, background: t.bgSurface,
          }}>
            {photos.map((p, i) => {
              const active = i === idx;
              return (
                <button key={p.id} ref={active ? activeThumbRef : undefined} type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Фото ${i + 1}${p.name ? `: ${p.name}` : ''}`}
                  aria-current={active || undefined}
                  style={{
                    flexShrink: 0, width: THUMB, height: THUMB, padding: 0, borderRadius: 8,
                    overflow: 'hidden', cursor: 'pointer', background: t.bg,
                    border: active ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    boxShadow: active ? `0 0 0 3px ${t.accentGlow}` : 'none',
                    opacity: active ? 1 : 0.75, transition: 'opacity .15s, border-color .15s',
                    touchAction: 'manipulation',
                  }}>
                  <img src={p.thumbUrl ?? p.url} alt="" loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Полноразмерный просмотр: оригинальное разрешение, скролл/панорама */}
      {fullscreen && current && (
        <div role="dialog" aria-modal="true" aria-label="Фото в полном размере"
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,.92)',
            overflow: 'auto', cursor: 'zoom-out', display: 'flex', padding: 24, boxSizing: 'border-box',
          }}>
          <img src={current.url} alt={current.name ?? 'Фото (оригинальный размер)'}
            style={{ margin: 'auto', display: 'block', maxWidth: 'none', maxHeight: 'none' }} />
          <button type="button" aria-label="Закрыть полноэкранный просмотр"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            style={{
              position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))',
              right: 'calc(16px + env(safe-area-inset-right, 0px))',
              background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 14px', minHeight: 40, fontSize: 14, fontFamily: 'inherit',
              cursor: 'pointer', zIndex: 1301,
            }}>
            Закрыть ✕
          </button>
        </div>
      )}
    </div>
  );
}