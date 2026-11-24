// Nav.ts — типы навигации и чистые хелперы (используются PageLayout и AppContext).
// Правила видимости: webAdminOnly, allowedTabs, visible и право acl.
import type { ReactNode } from 'react';
import { canView } from '../acl';

/** Минимальный пользователь для фильтрации навигации. */
export interface NavUser {
  webAdmin?: boolean;
  allowedTabs?: string[] | null;
  acl?: { view?: string[] | null; edit?: string[] | null } | null;
}

/** Пункт/подпункт навигации с правилами видимости. */
export interface NavTabChild<TUser extends NavUser = NavUser> {
  id: string;
  label: string;
  icon?: ReactNode;
  webAdminOnly?: boolean;
  /** Идентификатор ресурса ('users'). Нет права — пункт скрыт. */
  acl?: string;
  visible?: (user: TUser | null) => boolean;
}

/** Пункт навигации верхнего уровня. */
export interface NavTab<TUser extends NavUser = NavUser> extends NavTabChild<TUser> {
  icon: ReactNode;
  children?: NavTabChild<TUser>[];
  displayMode?: 'keep' | 'replace';
}

export type VisibleNavTabChild = Omit<NavTabChild, 'webAdminOnly' | 'visible' | 'acl'>;
export type VisibleNavTab = Omit<NavTab, 'webAdminOnly' | 'visible' | 'acl' | 'children'> & {
  children?: VisibleNavTabChild[];
};

export interface FilterNavTabsOptions<TUser extends NavUser> {
  /** Показывать ли навигацию гостям. */
  guestTabs?: boolean;
  /** Кастомная проверка доступа к пункту. */
  canSeeBase?: (id: string, user: TUser) => boolean;
}

const defaultCanSeeBase = (id: string, user: NavUser): boolean => {
  if (user.webAdmin) return true;
  if (!Array.isArray(user.allowedTabs)) return true;
  return user.allowedTabs.includes(id);
};

/** Фильтрует навигацию по правам пользователя и убирает служебные поля. */
export function filterNavTabs<TUser extends NavUser>(
  tabs: readonly NavTab<TUser>[],
  user: TUser | null,
  options: FilterNavTabsOptions<TUser> = {},
): VisibleNavTab[] {
  const { guestTabs = false, canSeeBase = defaultCanSeeBase } = options;
  if (!user && !guestTabs) return [];

  const canSee = (node: NavTabChild<TUser>): boolean => {
    if (node.webAdminOnly && !user?.webAdmin) return false;
    if (!canView(user, node.acl)) return false;
    if (!node.webAdminOnly && user && !canSeeBase(node.id, user)) return false;
    if (node.visible && !node.visible(user)) return false;
    return true;
  };

  const clean = <T extends NavTabChild<TUser>>(node: T) => {
    const { webAdminOnly: _w, visible: _v, acl: _p, ...rest } = node;
    return rest;
  };

  return tabs
    .map((tab): VisibleNavTab | null => {
      if (!canSee(tab)) return null;
      const { children, ...rest } = tab;
      const base = clean(rest);
      if (!children) return base;
      const filtered = children.filter(canSee).map(clean);
      return filtered.length ? { ...base, children: filtered } : null;
    })
    .filter((t): t is VisibleNavTab => t !== null);
}

const matches = (pathname: string, id: string): boolean => {
  if (!id.startsWith('/')) return false;
  if (id === '/') return pathname === '/';
  return pathname === id || pathname.startsWith(`${id}/`);
};

/** Определяет активный таб по pathname: самое длинное совпадение, дети приоритетнее. */
export function matchActiveTab(
  pathname: string,
  tabs: readonly { id: string; children?: readonly { id: string }[] }[],
): string {
  const candidates: { id: string; child: boolean }[] = [];
  for (const tab of tabs) {
    for (const c of tab.children ?? []) if (matches(pathname, c.id)) candidates.push({ id: c.id, child: true });
    if (matches(pathname, tab.id)) candidates.push({ id: tab.id, child: false });
  }
  candidates.sort((a, b) => b.id.length - a.id.length || Number(b.child) - Number(a.child));
  return candidates[0]?.id ?? '/';
}