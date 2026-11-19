// AppContext.tsx — единый контекст приложения: адаптивность + персистентные
// настройки + авторизация + HTTP-клиент для useFetch.
//
// ИЗМЕНЕНИЕ: AppProvider публикует axiosInstance модуля через FetchClientContext,
// поэтому все useFetch внутри приложения ходят тем же клиентом (моки, interceptors,
// baseURL), что и авторизация. Без провайдера useFetch использует глобальный axios.
//
// NOTE: цикл импорта AppContext ↔ PageLayout безопасен: с обеих сторон
// используются только function declarations, вызываемые в render-time.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  useSyncExternalStore, type ComponentType, type Dispatch, type ReactNode, type SetStateAction,
} from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { themes, type Theme, type ThemeName } from '../themes/theme';
import { FetchClientContext } from '../hooks';
import type { LayoutMode } from '../components/Header';
import { PageLayout, type PageLayoutProps, type FooterConfig } from '../components/PageLayout';
import type { NavTab } from '../components/Nav';

/* ───────────────────────── Media queries ───────────────────────── */

const mqlCache = new Map<string, MediaQueryList>();
function getMQL(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  let mql = mqlCache.get(query);
  if (!mql) { mql = window.matchMedia(query); mqlCache.set(query, mql); }
  return mql;
}

/** Подписка на media-query: SSR-safe, без tearing, с кэшем MediaQueryList. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = getMQL(query);
    if (!mql) return () => {};
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  const get = useCallback(() => getMQL(query)?.matches ?? false, [query]);
  const getServer = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, get, getServer);
}

/* ───────────────────────── Адаптивность ───────────────────────── */

export interface ResponsiveConfig {
  /** Верхняя граница мобильного диапазона, px. @default 640 */
  mobileBreakpoint?: number;
  /** Верхняя граница планшетного диапазона, px. @default 1024 */
  tabletBreakpoint?: number;
  /** Принудительный режим (Storybook / визуальные тесты). */
  forceMode?: 'mobile' | 'tablet' | 'desktop';
}

export interface ResponsiveValue {
  isMobile: boolean; isTablet: boolean; isDesktop: boolean;
  width: 'mobile' | 'tablet' | 'desktop';
  /** Устройство с hover-указателем (мышь/trackpad). */
  hasHover: boolean;
  /** Основной указатель — touch. */
  isTouch: boolean;
  /** Пользователь предпочитает reduced motion. */
  prefersReducedMotion: boolean;
}

const DESKTOP_DEFAULT: ResponsiveValue = {
  isMobile: false, isTablet: false, isDesktop: true, width: 'desktop',
  hasHover: true, isTouch: false, prefersReducedMotion: false,
};

const ResponsiveCtx = createContext<ResponsiveValue>(DESKTOP_DEFAULT);

/** Адаптивное состояние приложения. Без провайдера — desktop-дефолты. */
export function useResponsive(): ResponsiveValue {
  return useContext(ResponsiveCtx);
}

function ResponsiveLayer({
  children, mobileBreakpoint = 640, tabletBreakpoint = 1024, forceMode,
}: ResponsiveConfig & { children: ReactNode }) {
  const mobileQ = useMediaQuery(`(max-width: ${mobileBreakpoint}px)`);
  const tabletQ = useMediaQuery(`(max-width: ${tabletBreakpoint}px)`);
  const hoverQ = useMediaQuery('(hover: hover)');
  const touchQ = useMediaQuery('(pointer: coarse)');
  const reducedQ = useMediaQuery('(prefers-reduced-motion: reduce)');
  const value = useMemo<ResponsiveValue>(() => {
    if (forceMode) {
      const m = forceMode === 'mobile', t = forceMode === 'tablet';
      return {
        isMobile: m, isTablet: t, isDesktop: !m && !t, width: forceMode,
        hasHover: m ? false : hoverQ, isTouch: m ? true : touchQ, prefersReducedMotion: reducedQ,
      };
    }
    const isMobile = mobileQ, isTablet = !mobileQ && tabletQ;
    return {
      isMobile, isTablet, isDesktop: !tabletQ,
      width: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      hasHover: hoverQ, isTouch: touchQ, prefersReducedMotion: reducedQ,
    };
  }, [mobileQ, tabletQ, hoverQ, touchQ, reducedQ, forceMode]);
  return <ResponsiveCtx.Provider value={value}>{children}</ResponsiveCtx.Provider>;
}

export interface AppProviderProps extends ResponsiveConfig { children: ReactNode; }

/**
 * Базовый провайдер UI Kit (только адаптивность). Модуль из createAppModule
 * включает адаптивность автоматически — двойной провайдер не нужен.
 */
export function AppProvider({ children, ...cfg }: AppProviderProps) {
  return <ResponsiveLayer {...cfg}>{children}</ResponsiveLayer>;
}

/* ───────────────────────── Персистентные настройки ───────────────────────── */

export interface SettingDef<T> {
  default: T;
  validate?: (value: unknown) => boolean;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
}
export type SettingsSchema = Record<string, SettingDef<any>>;
export type SettingValues<S extends SettingsSchema> = { [K in keyof S]: S[K]['default'] };
export type SettingSetters<S extends SettingsSchema> = {
  [K in keyof S as `set${Capitalize<string & K>}`]: (value: S[K]['default']) => void;
};

/** Описывает настройку схемы: значение по умолчанию + опциональная валидация. */
export const setting = <T,>(defaultValue: T, validate?: (v: unknown) => boolean): SettingDef<T> =>
  ({ default: defaultValue, validate });

/** Валидатор «одно из перечисленных строковых значений». */
export const oneOf = <T extends string>(...values: readonly T[]) =>
  (v: unknown): v is T => values.includes(v as T);

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const setterName = (s: string) => `set${s[0].toUpperCase()}${s.slice(1)}`;
const defaultSerialize = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const defaultParse = (raw: string): unknown => { try { return JSON.parse(raw); } catch { return raw; } };

export interface UsePersistentStateOptions<T> {
  validate?: (v: unknown) => boolean;
  parse?: (raw: string) => T;
  serialize?: (v: T) => string;
  /** Синхронизировать между вкладками через storage-событие. @default true */
  syncTabs?: boolean;
}

/** useState с персистом в localStorage, валидацией и синхронизацией вкладок. */
export function usePersistentState<T>(
  key: string, initial: T, options: UsePersistentStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const optsRef = useRef(options); optsRef.current = options;
  const initialRef = useRef(initial); initialRef.current = initial;
  const read = useCallback((): T => {
    if (typeof window === 'undefined') return initialRef.current;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialRef.current;
      const parsed = (optsRef.current.parse ?? defaultParse)(raw) as T;
      if (parsed === null || parsed === undefined) return initialRef.current;
      if (optsRef.current.validate && !optsRef.current.validate(parsed)) return initialRef.current;
      return parsed;
    } catch { return initialRef.current; }
  }, [key]);
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    try { window.localStorage.setItem(key, (optsRef.current.serialize ?? defaultSerialize)(value)); } catch { /* ignore */ }
  }, [key, value]);
  const syncTabs = options.syncTabs ?? true;
  useEffect(() => {
    if (!syncTabs || typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => { if (e.key === key && e.newValue !== null) setValue(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, syncTabs, read]);
  return [value, setValue];
}

/* ───────────────────────── Типы модуля ───────────────────────── */

export interface BaseUser {
  userId: number; username: string; name: string; surname: string;
  isAdmin: boolean; webAdmin?: boolean; allowedTabs?: string[] | null;
}

export interface AuthEndpoints {
  me: string; login: string; logout: string; changePassword: string; sessionEnd?: string;
}

export interface AuthContextType<TUser extends BaseUser> {
  user: TUser | null; loading: boolean; error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export interface BaseUIState {
  theme: ThemeName; layout: LayoutMode; perPage: number;
  setTheme: (t: ThemeName) => void;
  setLayout: (l: LayoutMode) => void;
  setPerPage: (n: number) => void;
}

export interface ProfileModalProps<TUser> {
  theme: Theme; isOpen: boolean; onClose: () => void; user: TUser | null;
}

export interface AppModuleOptions<TUser extends BaseUser, S extends SettingsSchema> {
  siteName: string;
  logo?: ReactNode;
  tabs: readonly NavTab<TUser>[];
  guestTabs?: boolean;
  scrollMode?: 'content' | 'inner';
  footer?: FooterConfig | false;
  headerProps?: PageLayoutProps<TUser>['headerProps'];
  profile?: { canSee?: (user: TUser | null) => boolean; Modal: ComponentType<ProfileModalProps<TUser>> };
  /** HTTP-клиент модуля: auth И useFetch внутри AppProvider. @default axios */
  axiosInstance?: AxiosInstance;
  endpoints?: Partial<AuthEndpoints>;
  refreshOn?: ReadonlyArray<'focus' | 'visibility'>;
  messages?: Partial<typeof DEFAULT_MESSAGES>;
  settings?: S;
  storagePrefix?: string;
  defaultTheme?: ThemeName;
  defaultLayout?: LayoutMode;
  defaultPerPage?: number;
  mobileBreakpoint?: number;
  loginPath?: string;
  homePath?: string;
  noAccess?: ReactNode;
}

export type AppContextType<TUser extends BaseUser, S extends SettingsSchema> =
  AuthContextType<TUser> & BaseUIState & SettingValues<S> & SettingSetters<S>;

/** Пропсы провайдера, созданного createAppModule. */
export interface ModuleProviderProps {
  children: ReactNode;
  storagePrefix?: string;
  defaultTheme?: ThemeName;
  defaultLayout?: LayoutMode;
  defaultPerPage?: number;
  settingDefaults?: Record<string, unknown>;
  axiosInstance?: AxiosInstance;
  endpoints?: Partial<AuthEndpoints>;
}

export type BoundPageLayoutProps = Pick<
  PageLayoutProps, 'title' | 'actions' | 'children' | 'padding' | 'paddingBottom'
>;

const DEFAULT_ENDPOINTS: AuthEndpoints = {
  me: '/api/auth/me', login: '/api/auth/login', logout: '/api/auth/logout',
  changePassword: '/api/auth/change-password', sessionEnd: '/api/usage/session/end',
};

const DEFAULT_MESSAGES = {
  authCheckFailed: 'Не удалось проверить авторизацию',
  invalidCredentials: 'Неверное имя пользователя или пароль',
  loginFailed: 'Ошибка входа, попробуйте позже',
  changePasswordFailed: 'Не удалось сменить пароль',
};

/* ───────────────────────── Фабрика модуля ───────────────────────── */

/**
 * Создаёт модуль приложения: AppProvider (auth + UI + настройки + адаптивность +
 * HTTP-клиент), хуки useApp/useAuth/useUI, привязанный PageLayout и route-guards.
 *
 *   createAppModule<User>()({ siteName, tabs, axiosInstance, settings: {...} })
 */
export function createAppModule<TUser extends BaseUser = BaseUser>() {
  return function buildAppModule<S extends SettingsSchema = {}>(options: AppModuleOptions<TUser, S>) {
    const {
      siteName, logo, tabs, guestTabs, scrollMode, footer, headerProps, profile,
      axiosInstance: defaultAxios = axios, endpoints: defaultEndpoints, refreshOn = [], messages,
      settings, storagePrefix: defaultPrefix = 'app',
      defaultTheme: defTheme = 'light', defaultLayout: defLayout = 'horizontal',
      defaultPerPage: defPerPage = 50, mobileBreakpoint = 640,
      loginPath = '/login', homePath = '/', noAccess,
    } = options;
    const msg = { ...DEFAULT_MESSAGES, ...messages };
    const settingsEntries = Object.entries(settings ?? {}) as [string, SettingDef<any>][];

    const AuthContext = createContext<AuthContextType<TUser> | undefined>(undefined);
    const UIContext = createContext<(BaseUIState & SettingValues<S> & SettingSetters<S>) | undefined>(undefined);

    /* ── Auth ── */
    const AuthProvider = ({ children, axiosInstance = defaultAxios, endpoints: override }: ModuleProviderProps) => {
      const endpoints = useMemo<AuthEndpoints>(
        () => ({ ...DEFAULT_ENDPOINTS, ...defaultEndpoints, ...override }), [override]);
      const [user, setUser] = useState<TUser | null>(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      const fetchUser = useCallback(async (silent = false) => {
        if (!silent) { setLoading(true); setError(null); }
        try {
          const res = await axiosInstance.get<{ user: TUser }>(endpoints.me);
          setUser(res.data.user);
        } catch (err) {
          const e = err as AxiosError;
          if (e.response?.status === 401) setUser(null);
          else if (!silent) setError(msg.authCheckFailed);
        } finally {
          if (!silent) setLoading(false);
        }
      }, [axiosInstance, endpoints.me]);

      useEffect(() => { void fetchUser(); }, [fetchUser]);

      useEffect(() => {
        const id = axiosInstance.interceptors.response.use(
          (r) => r,
          (err: AxiosError) => { if (err.response?.status === 401) setUser(null); return Promise.reject(err); });
        return () => { axiosInstance.interceptors.response.eject(id); };
      }, [axiosInstance]);

      const hasUser = !!user;
      useEffect(() => {
        if (!hasUser || refreshOn.length === 0) return;
        const refresh = () => { void fetchUser(true); };
        const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
        if (refreshOn.includes('focus')) window.addEventListener('focus', refresh);
        if (refreshOn.includes('visibility')) document.addEventListener('visibilitychange', onVis);
        return () => {
          window.removeEventListener('focus', refresh);
          document.removeEventListener('visibilitychange', onVis);
        };
      }, [hasUser, fetchUser]);

      const login = useCallback(async (username: string, password: string) => {
        setError(null);
        try {
          const res = await axiosInstance.post<{ user: TUser }>(endpoints.login, { username, password });
          setUser(res.data.user);
        } catch (err) {
          const e = err as AxiosError;
          setError(e.response?.status === 401 ? msg.invalidCredentials : msg.loginFailed);
          throw err;
        }
      }, [axiosInstance, endpoints.login]);

      const logout = useCallback(async () => {
        setError(null);
        try {
          if (endpoints.sessionEnd) await axiosInstance.post(endpoints.sessionEnd).catch(() => {});
          await axiosInstance.post(endpoints.logout);
        } catch { /* ignore */ } finally { setUser(null); }
      }, [axiosInstance, endpoints.logout, endpoints.sessionEnd]);

      const refreshUser = useCallback(async () => { await fetchUser(true); }, [fetchUser]);
      const clearError = useCallback(() => setError(null), []);
      const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
        try {
          await axiosInstance.post(endpoints.changePassword, { oldPassword, newPassword });
        } catch (err) {
          const e = err as AxiosError<{ error?: string }>;
          throw new Error(e.response?.data?.error ?? msg.changePasswordFailed);
        }
      }, [axiosInstance, endpoints.changePassword]);

      const value = useMemo<AuthContextType<TUser>>(
        () => ({ user, loading, error, login, logout, refreshUser, clearError, changePassword }),
        [user, loading, error, login, logout, refreshUser, clearError, changePassword]);
      return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    };

    /* ── UI + настройки ── */
    const UIProvider = ({
      children, storagePrefix = defaultPrefix, defaultTheme = defTheme,
      defaultLayout = defLayout, defaultPerPage = defPerPage, settingDefaults,
    }: ModuleProviderProps) => {
      const [theme, setTheme] = usePersistentState<ThemeName>(`${storagePrefix}-theme`, defaultTheme,
        { validate: (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(themes, v) });
      const [layout, setLayout] = usePersistentState<LayoutMode>(`${storagePrefix}-layout`, defaultLayout,
        { validate: oneOf('horizontal', 'vertical') });
      const [perPage, setPerPage] = usePersistentState<number>(`${storagePrefix}-per-page`, defaultPerPage,
        { validate: (v) => typeof v === 'number' && Number.isInteger(v) && v > 0 });

      const extraValues: Record<string, unknown> = {};
      const extraSetters: Record<string, unknown> = {};
      // Схема фиксирована при создании модуля → порядок хуков стабилен.
      for (const [key, def] of settingsEntries) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [v, setV] = usePersistentState(`${storagePrefix}-${kebab(key)}`, settingDefaults?.[key] ?? def.default,
          { validate: def.validate, parse: def.parse, serialize: def.serialize });
        extraValues[key] = v;
        extraSetters[setterName(key)] = setV;
      }
      const value = useMemo(
        () => ({ theme, layout, perPage, setTheme, setLayout, setPerPage, ...extraValues, ...extraSetters }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme, layout, perPage, ...Object.values(extraValues)]);
      return <UIContext.Provider value={value as BaseUIState & SettingValues<S> & SettingSetters<S>}>{children}</UIContext.Provider>;
    };

    const AppProvider = (props: ModuleProviderProps) => (
      <FetchClientContext.Provider value={props.axiosInstance ?? defaultAxios}>
        <AuthProvider {...props}>
          <UIProvider {...props}>
            <ResponsiveLayer mobileBreakpoint={mobileBreakpoint}>{props.children}</ResponsiveLayer>
          </UIProvider>
        </AuthProvider>
      </FetchClientContext.Provider>
    );

    const useAuth = (): AuthContextType<TUser> => {
      const ctx = useContext(AuthContext);
      if (!ctx) throw new Error('useAuth must be used within AppProvider');
      return ctx;
    };
    const useUI = (): BaseUIState & SettingValues<S> & SettingSetters<S> => {
      const ctx = useContext(UIContext);
      if (!ctx) throw new Error('useUI must be used within AppProvider');
      return ctx;
    };
    /** Auth + UI + настройки одним объектом (мемоизирован). */
    const useApp = (): AppContextType<TUser, S> => {
      const auth = useAuth();
      const ui = useUI();
      return useMemo(() => ({ ...auth, ...ui }) as AppContextType<TUser, S>, [auth, ui]);
    };

    /* ── Guards ── */
    const noAccessNode = noAccess ?? (
      <div style={{ padding: 40, textAlign: 'center', fontSize: 15, lineHeight: 1.6 }}>
        У вас нет доступных разделов.<br />Обратитесь к администратору для назначения роли.
      </div>
    );

    const ProtectedRoute = ({ children, redirectTo = loginPath }: { children?: ReactNode; redirectTo?: string }) => {
      const { user, loading } = useAuth();
      if (loading) return null;
      if (!user) return <Navigate to={redirectTo} replace />;
      return <>{children ?? <Outlet />}</>;
    };
    const AdminRoute = ({ children, redirectTo = loginPath, forbiddenRedirectTo = homePath }:
      { children?: ReactNode; redirectTo?: string; forbiddenRedirectTo?: string }) => {
      const { user, loading } = useAuth();
      if (loading) return null;
      if (!user) return <Navigate to={redirectTo} replace />;
      if (!user.isAdmin) return <Navigate to={forbiddenRedirectTo} replace />;
      return <>{children ?? <Outlet />}</>;
    };
    const WebAdminRoute = ({ children, redirectTo = loginPath, forbiddenRedirectTo = homePath }:
      { children?: ReactNode; redirectTo?: string; forbiddenRedirectTo?: string }) => {
      const { user, loading } = useAuth();
      if (loading) return null;
      if (!user) return <Navigate to={redirectTo} replace />;
      if (!user.webAdmin) return <Navigate to={forbiddenRedirectTo} replace />;
      return <>{children ?? <Outlet />}</>;
    };
    const TabGuard = ({ tabId, children, redirectTo }: { tabId: string; children: ReactNode; redirectTo?: string }) => {
      const { user, loading } = useAuth();
      if (loading) return null;
      if (!user) return <Navigate to={loginPath} replace />;
      if (user.webAdmin || !Array.isArray(user.allowedTabs) || user.allowedTabs.includes(tabId)) return <>{children}</>;
      if (redirectTo && redirectTo !== tabId) return <Navigate to={redirectTo} replace />;
      return <>{noAccessNode}</>;
    };

    /* ── Привязанный PageLayout ── */
    const BoundPageLayout = ({ title, actions, children, padding, paddingBottom }: BoundPageLayoutProps) => {
      const { user, logout, theme, layout, setTheme, setLayout } = useApp();
      const [profileOpen, setProfileOpen] = useState(false);
      const canSeeProfile = !!profile && (profile.canSee?.(user) ?? (!!user && !user.webAdmin));
      const ProfileModal = profile?.Modal;
      return (
        <>
          <PageLayout
            siteName={siteName} logo={logo} tabs={tabs} guestTabs={guestTabs}
            scrollMode={scrollMode} footer={footer} headerProps={headerProps}
            user={user} onSignOut={logout}
            theme={theme} onThemeChange={setTheme}
            layout={layout} onLayoutChange={setLayout}
            onProfileClick={canSeeProfile ? () => setProfileOpen(true) : undefined}
            title={title} actions={actions} padding={padding} paddingBottom={paddingBottom}
          >
            {children}
          </PageLayout>
          {canSeeProfile && ProfileModal && (
            <ProfileModal theme={themes[theme]} isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
          )}
        </>
      );
    };

    return {
      AppProvider, useApp, useAuth, useUI,
      PageLayout: BoundPageLayout,
      ProtectedRoute, AdminRoute, WebAdminRoute, TabGuard,
    };
  };
}