// permissions.tsx — ролевая модель UI Kit: права-строки + провайдер + useCan + Can/CanEdit.
import React, {
  createContext, useCallback, useContext, useEffect, useRef,
  type CSSProperties, type ReactNode,
} from 'react';

/** Минимальный пользователь для проверки прав. */
export interface PermissionUser {
  webAdmin?: boolean;
  /** Список прав ('*' — все). Админам права выдаёт бэкенд. */
  permissions?: string[] | null;
}

/** Нет требования — доступно всем; webAdmin — всё; иначе — по списку прав. */
export function hasPermission(user: PermissionUser | null | undefined, permission?: string): boolean {
  if (!permission) return true;
  if (!user) return false;
  if (user.webAdmin) return true;
  const list = user.permissions;
  return Array.isArray(list) && (list.includes('*') || list.includes(permission));
}

const PermissionsCtx = createContext<PermissionUser | null>(null);

/** Провайдер текущего пользователя для useCan/Can/CanEdit. createAppModule ставит сам. */
export function PermissionsProvider({ user, children }: { user: PermissionUser | null; children: ReactNode }) {
  return <PermissionsCtx.Provider value={user}>{children}</PermissionsCtx.Provider>;
}

/** const can = useCan(); can('users.edit'). Без провайдера — только требования без permission. */
export function useCan(): (permission?: string) => boolean {
  const user = useContext(PermissionsCtx);
  return useCallback((permission?: string) => hasPermission(user, permission), [user]);
}

/** Видимость: нет права — children не рендерится (или fallback). */
export function Can({ permission, fallback = null, children }: {
  permission?: string; fallback?: ReactNode; children: ReactNode;
}) {
  return useCan()(permission) ? <>{children}</> : <>{fallback}</>;
}

/** Редактируемость: нет права — контент виден, но заблокирован (inert + приглушение). */
export function CanEdit({ permission, children, style }: {
  permission?: string; children: ReactNode; style?: CSSProperties;
}) {
  const locked = !useCan()(permission);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (locked) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  }, [locked]);
  if (!locked) return <>{children}</>;
  return (
    <div ref={ref} aria-disabled="true" style={{ opacity: 0.55, pointerEvents: 'none', ...style }}>
      {children}
    </div>
  );
}