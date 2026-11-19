// Feedback.tsx — тосты и confirm-диалог вместо alert()/window.confirm().
// Оборачивается один раз в корне приложения: <FeedbackProvider theme={t}>…</FeedbackProvider>.
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { Theme } from '../themes/theme';
import { useResponsive } from '../context/AppContext';
import Modal from './Modal';
import Button from './Button';
import { IcoCheck, IcoX, IcoSearch, IcoFilter } from './icons';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** Кнопка действия внутри тоста (например «Повторить»). */
  action?: { label: string; onClick: () => void };
  /** Время жизни, мс. @default 4200 (8000 при наличии action) */
  durationMs?: number;
}

export interface ToastApi {
  /** Успешное уведомление. */
  success: (text: string, options?: ToastOptions) => void;
  /** Уведомление об ошибке. */
  error: (text: string, options?: ToastOptions) => void;
  /** Нейтральное уведомление. */
  info: (text: string, options?: ToastOptions) => void;
  /** Предупреждение. */
  warning: (text: string, options?: ToastOptions) => void;
}

export interface ConfirmOptions {
  /** Заголовок окна. @default 'Подтверждение' */
  title?: string;
  /** Текст вопроса. */
  message: ReactNode;
  /** Подпись подтверждения. @default 'Подтвердить' */
  okText?: string;
  /** Подпись отмены. @default 'Отмена' */
  cancelText?: string;
  /** Опасное действие — акцент на предупреждении. */
  danger?: boolean;
}

interface ToastItem extends ToastOptions { id: number; kind: ToastKind; text: string }
interface ConfirmState extends ConfirmOptions { resolve: (v: boolean) => void }

const FeedbackCtx = createContext<{ toast: ToastApi; confirm: (o: ConfirmOptions) => Promise<boolean> } | null>(null);
let seq = 0;

/** Провайдер тостов и confirm-диалога. Требует тему оформления. */
export function FeedbackProvider({ theme: t, children }: { theme: Theme; children: ReactNode }) {
  const { isMobile } = useResponsive();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) { window.clearTimeout(tm); timers.current.delete(id); }
  }, []);

  const show = useCallback((kind: ToastKind, text: string, options?: ToastOptions) => {
    const id = ++seq;
    setToasts((list) => [...list.slice(-4), { id, kind, text, ...options }]);
    const ttl = options?.durationMs ?? (options?.action ? 8000 : 4200);
    timers.current.set(id, window.setTimeout(() => dismiss(id), ttl));
  }, [dismiss]);

  useEffect(() => () => { timers.current.forEach((tm) => window.clearTimeout(tm)); timers.current.clear(); }, []);

  const toast = useMemo<ToastApi>(() => ({
    success: (m, o) => show('success', m, o),
    error: (m, o) => show('error', m, o),
    info: (m, o) => show('info', m, o),
    warning: (m, o) => show('warning', m, o),
  }), [show]);

  const confirm = useCallback((o: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })), []);

  const closeConfirm = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  const colors: Record<ToastKind, string> = { success: t.success, error: t.danger, info: t.accent, warning: t.pending };
  const icons: Record<ToastKind, ReactNode> = {
    success: <IcoCheck s={13} />, error: <IcoX s={12} />, info: <IcoSearch s={13} />, warning: <IcoFilter s={13} />,
  };

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" style={{
        position: 'fixed', zIndex: 1200, right: 16, left: isMobile ? 16 : 'auto',
        bottom: `calc(${isMobile ? 76 : 16}px + env(safe-area-inset-bottom, 0px))`,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, pointerEvents: 'none',
      }}>
        {toasts.map((item) => (
          <div key={item.id} style={{
            pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
            background: t.bgSurface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${colors[item.kind]}`,
            borderRadius: 12, padding: '10px 12px', boxShadow: t.shadowLg, color: t.text, fontSize: 13, lineHeight: 1.45,
          }}>
            <span style={{ color: colors[item.kind], display: 'flex', flexShrink: 0 }}>{icons[item.kind]}</span>
            <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{item.text}</span>
            {item.action && (
              <Button theme={t} size="sm" outline onClick={() => { item.action!.onClick(); dismiss(item.id); }}>
                {item.action.label}
              </Button>
            )}
            <button type="button" aria-label="Закрыть уведомление" onClick={() => dismiss(item.id)}
              style={{ background: 'none', border: 'none', color: t.iconColor, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <IcoX s={10} />
            </button>
          </div>
        ))}
      </div>
      <Modal
        theme={t} isOpen={!!confirmState} onClose={() => closeConfirm(false)} onOk={() => closeConfirm(true)}
        title={confirmState?.title ?? 'Подтверждение'} columns={1} rows={1} width={460}
        okText={confirmState?.okText ?? 'Подтвердить'} cancelText={confirmState?.cancelText ?? 'Отмена'}
        fields={[{
          row: 0, col: 0,
          content: (
            <div style={{ color: t.text, fontSize: 14, lineHeight: 1.6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {confirmState?.danger && <span style={{ color: t.danger, display: 'flex', marginTop: 2 }}><IcoFilter s={16} /></span>}
              <div style={{ minWidth: 0 }}>{confirmState?.message}</div>
            </div>
          ),
        }]}
      />
    </FeedbackCtx.Provider>
  );
}

/** Тосты: toast.success / error / info / warning. Требует FeedbackProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('useToast must be used within FeedbackProvider');
  return ctx.toast;
}

/** Диалог подтверждения: `if (!(await confirm({ message, danger: true }))) return;`. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('useConfirm must be used within FeedbackProvider');
  return ctx.confirm;
}