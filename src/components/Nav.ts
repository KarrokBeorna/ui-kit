import type { ReactNode } from 'react';

export interface NavUser {
  isAdmin?: boolean;
  webAdmin?: boolean;
  allowedTabs?: string[] | null;
}

export interface NavTabChild<TUser extends NavUser = NavUser> {
  id: string;
  label: string;
  icon?: ReactNode;
  adminOnly?: boolean;
  webAdminOnly?: boolean;
  visible?: (user: TUser | null) => boolean;
}

export interface NavTab<TUser extends NavUser = NavUser> extends NavTabChild<TUser> {
  icon: ReactNode;
  children?: NavTabChild<TUser>[];
  displayMode?: 'keep' | 'replace';
}

export type VisibleNavTabChild = Omit<NavTabChild, 'adminOnly' | 'webAdminOnly' | 'visible'>;
export type VisibleNavTab = Omit<NavTab, 'adminOnly' | 'webAdminOnly' | 'visible' | 'children'> & {
  children?: VisibleNavTabChild[];
};

export interface FilterNavTabsOptions<TUser extends NavUser> {
  guestTabs?: boolean;
  canSeeBase?: (id: string, user: TUser) => boolean;
}

const defaultCanSeeBase = (id: string, user: NavUser): boolean => {
  if (user.webAdmin) return true;
  if (!Array.isArray(user.allowedTabs)) return true;
  return user.allowedTabs.includes(id);
};

export function filterNavTabs<TUser extends NavUser>(
  tabs: readonly NavTab<TUser>[],
  user: TUser | null,
  options: FilterNavTabsOptions<TUser> = {},
): VisibleNavTab[] {
  const { guestTabs = false, canSeeBase = defaultCanSeeBase } = options;
  if (!user && !guestTabs) return [];

  const canSee = (node: NavTabChild<TUser>): boolean => {
    if (node.webAdminOnly && !user?.webAdmin) return false;
    if (node.adminOnly && !user?.isAdmin) return false;
    if (!node.adminOnly && !node.webAdminOnly && user && !canSeeBase(node.id, user)) return false;
    if (node.visible && !node.visible(user)) return false;
    return true;
  };

  const clean = <T extends NavTabChild<TUser>>(node: T) => {
    const { adminOnly: _a, webAdminOnly: _w, visible: _v, ...rest } = node;
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

/** Самое длинное совпадение выигрывает; при равной длине дети приоритетнее. */
export function matchActiveTab(
  pathname: string,
  tabs: readonly { id: string; children?: readonly { id: string }[] }[],
): string {
  const candidates: { id: string; child: boolean }[] = [];
  for (const tab of tabs) {
    for (const c of tab.children ?? []) {
      if (matches(pathname, c.id)) candidates.push({ id: c.id, child: true });
    }
    if (matches(pathname, tab.id)) candidates.push({ id: tab.id, child: false });
  }
  candidates.sort((a, b) => b.id.length - a.id.length || Number(b.child) - Number(a.child));
  return candidates[0]?.id ?? '/';
}