// acl.tsx — ролевая модель UI Kit: реестр ресурсов + права view/edit + авто-обнаружение.
//
// Идея:
//  • компонент объявляет только идентификатор ресурса (проп acl);
//  • ресурс сам регистрируется в реестре при первом рендере;
//  • провайдер батчем отправляет обнаруженное на сервер (onDiscover);
//  • права выдаются в таблице ролей, а не в коде компонентов.
//
// Маски в списках прав: '*' — всё, 'users.*' — раздел целиком, иначе точный id.
import React, {
  createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode,
} from 'react';

/** Вид ресурса — определяет группировку в редакторе ролей. */
export type AclKind = 'header' | 'menu' | 'directory' | 'button' | 'field';

/** Ресурс, объявленный компонентом. */
export interface AclResource {
  id: string;
  kind: AclKind;
  label: string;
}

/** Списки разрешённых ресурсов роли (или объединение ролей пользователя). */
export interface AclGrants {
  view?: string[] | null;
  edit?: string[] | null;
}

/** Минимальный пользователь для проверки прав. */
export interface AclUser {
  webAdmin?: boolean;
  acl?: AclGrants | null;
}

/** Совпадение id с маской: '*', 'users.*' или точное равенство. */
function matches(list: string[] | null | undefined, id: string): boolean {
  if (!Array.isArray(list)) return false;
  return list.some((p) =>
    p === '*' ||
    p === id ||
    (p.endsWith('.*') && (id === p.slice(0, -2) || id.startsWith(p.slice(0, -1)))));
}

/** Видимость/использование ресурса. Без id — доступно всем. */
export const canView = (user: AclUser | null | undefined, id?: string): boolean =>
  !id || (!!user && (!!user.webAdmin || matches(user.acl?.view, id)));

/** Редактируемость ресурса (поля). Без id — редактируемо. */
export const canEdit = (user: AclUser | null | undefined, id?: string): boolean =>
  !id || (!!user && (!!user.webAdmin || matches(user.acl?.edit, id)));

/* ───────────────────────── Реестр ресурсов ───────────────────────── */

const registry = new Map<string, AclResource>();
const listeners = new Set<() => void>();
let snapshot: AclResource[] = [];

/** Объявляет ресурс. Идемпотентно: повтор с теми же данными не будит подписчиков. */
export function registerResource(resource: AclResource): void {
  const prev = registry.get(resource.id);
  if (prev && prev.kind === resource.kind && prev.label === resource.label) return;
  registry.set(resource.id, resource);
  snapshot = [...registry.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Все обнаруженные ресурсы (для редактора ролей). SSR-safe, без tearing. */
export function useAclResources(): AclResource[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

/** Компонент объявляет свой ресурс при монтировании. */
export function useAclResource(kind: AclKind, id?: string, label?: string): void {
  useEffect(() => {
    if (id) registerResource({ id, kind, label: label || id });
  }, [kind, id, label]);
}

/* ───────────────────────── Контекст прав ───────────────────────── */

const AclCtx = createContext<AclUser | null>(null);

export interface AclProviderProps {
  /** Текущий пользователь (null — гость). */
  user: AclUser | null;
  /** Обнаруженные ресурсы: провайдер шлёт их батчем раз в секунду. */
  onDiscover?: (resources: AclResource[]) => void;
  children: ReactNode;
}

/** Провайдер прав. createAppModule ставит его сам между Auth и UI. */
export function AclProvider({ user, onDiscover, children }: AclProviderProps) {
  const resources = useAclResources();
  const cb = useRef(onDiscover);
  cb.current = onDiscover;

  useEffect(() => {
    if (!resources.length) return;
    const timer = window.setTimeout(() => cb.current?.(resources), 1000);
    return () => window.clearTimeout(timer);
  }, [resources]);

  return <AclCtx.Provider value={user}>{children}</AclCtx.Provider>;
}

/** Проверка прав: const { can, canEdit } = useAcl(). Без провайдера — только ресурсы без acl. */
export function useAcl(): { can: (id?: string) => boolean; canEdit: (id?: string) => boolean } {
  const user = useContext(AclCtx);
  return useMemo(() => ({
    can: (id?: string) => canView(user, id),
    canEdit: (id?: string) => canEdit(user, id),
  }), [user]);
}

export interface AclProps {
  /** Право видимости: нет — контент не рендерится. */
  id: string;
  /** Право редактирования. @default id */
  edit?: string;
  /** Подпись для редактора ролей. */
  label?: string;
  /** Что показать вместо скрытого контента. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Обёртка поля на странице: нет view — скрыто, нет edit — видно, но заблокировано. */
export function Acl({ id, edit = id, label, fallback = null, children }: AclProps) {
  const { can, canEdit: allowedToEdit } = useAcl();
  useAclResource('field', id, label);
  const ref = useRef<HTMLDivElement>(null);
  const visible = can(id);
  const locked = !allowedToEdit(edit);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (locked) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  }, [locked, visible]);

  if (!visible) return <>{fallback}</>;
  if (!locked) return <>{children}</>;

  return (
    <div ref={ref} aria-disabled="true" style={{ opacity: 0.55, pointerEvents: 'none' }}>
      {children}
    </div>
  );
}