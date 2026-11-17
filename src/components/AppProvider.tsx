import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ComponentType, type Dispatch, type ReactNode, type SetStateAction,
} from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { themes, type Theme, type ThemeName } from '../themes/theme';
import type { LayoutMode } from './header/LayoutToggle';
import { ResponsiveProvider } from '../context/ResponsiveContext';
import { PageLayout, type PageLayoutProps, type FooterConfig } from './PageLayout';
import type { NavTab } from './Nav';

/* ────────────────────────── Типы ────────────────────────── */

export interface BaseUser {
  userId: number;
  username: string;
  name: string;
  surname: string;
  isAdmin: boolean;
  webAdmin?: boolean;
  allowedTabs?: string[] | null;
}

export interface AuthEndpoints {
  me: string; login: string; logout: string; changePassword: string; sessionEnd?: string;
}

export interface AuthContextType<TUser extends BaseUser> {
  user: TUser | null;
  loading: boolean;
  error: string | null;
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

/* ─────────────────── Персистентные настройки ─────────────────── */

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

export const setting = <T,>(defaultValue: T, validate?: (v: unknown) => boolean): SettingDef<T> =>
  ({ default: defaultValue, validate });

export const oneOf = <T extends string>(...values: readonly T[]) =>
  (v: unknown): v is T => values.includes(v as T);

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const setterName = (s: string) => `set${s[0].toUpperCase()}${s.slice(1)}`;

const defaultSerialize = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const defaultParse = (raw: string): unknown => { try { return JSON.parse(raw); } catch { return raw; } };

export function usePersistentState<T>(
  key: string,
  initial: T,
  options: { validate?: (v: unknown) => boolean; parse?: (raw: string) => T; serialize?: (v: T) => string; syncTabs?: boolean } = {},
): [T, Dispatch<SetStateAction<T>>] {
  const optsRef = useRef(options);
  optsRef.current = options;
  const initialRef = useRef(initial);
  initialRef.current = initial;

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
    try {
      window.localStorage.setItem(key, (optsRef.current.serialize ?? defaultSerialize)(value));
    } catch { /* ignore */ }
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

/* ────────────────────────── Фабрика ────────────────────────── */

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

export interface ProfileModalProps<TUser> {
  theme: Theme; isOpen: boolean; onClose: () => void; user: TUser | null;
}

export interface AppModuleOptions<TUser extends BaseUser, S extends SettingsSchema> {
  /* layout */
  siteName: string;
  logo?: ReactNode;
  tabs: readonly NavTab<TUser>[];
  guestTabs?: boolean;
  scrollMode?: 'content' | 'inner';
  footer?: FooterConfig | false;
  headerProps?: PageLayoutProps<TUser>['headerProps'];
  profile?: { canSee?: (user: TUser | null) => boolean; Modal: ComponentType<ProfileModalProps<TUser>> };
  /* auth */
  axiosInstance?: AxiosInstance;
  endpoints?: Partial<AuthEndpoints>;
  refreshOn?: ReadonlyArray<'focus' | 'visibility'>;
  messages?: Partial<typeof DEFAULT_MESSAGES>;
  /* ui */
  settings?: S;
  storagePrefix?: string;
  defaultTheme?: ThemeName;
  defaultLayout?: LayoutMode;
  defaultPerPage?: number;
  mobileBreakpoint?: number;
  /* guards */
  loginPath?: string;
  homePath?: string;
  noAccess?: ReactNode;
}

export type AppContextType<TUser extends BaseUser, S extends SettingsSchema> =
  AuthContextType<TUser> & BaseUIState & SettingValues<S> & SettingSetters<S>;

export interface AppProviderProps {
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

/**
 * Первый вызов фиксирует тип пользователя, второй — выводит схему настроек.
 * Каррирование обязательно: при явном `createAppModule<User>({...})` TypeScript
 * не выводит второй type-параметр и подставляет дефолт `{}`.
 */
export function createAppModule<TUser extends BaseUser = BaseUser>() {
  return function buildAppModule<S extends SettingsSchema = {}>(options: AppModuleOptions<TUser, S>) {
    const {
      siteName, logo, tabs, guestTabs, scrollMode, footer, headerProps, profile,
      axiosInstance: defaultAxios = axios,
      endpoints: defaultEndpoints,
      refreshOn = [],
      messages,
      settings,
      storagePrefix: defaultPrefix = 'app',
      defaultTheme: defaultThemeOpt = 'light',
      defaultLayout: defaultLayoutOpt = 'horizontal',
      defaultPerPage: defaultPerPageOpt = 50,
      mobileBreakpoint = 640,
      loginPath = '/login',
      homePath = '/',
      noAccess,
    } = options;
    const msg = { ...DEFAULT_MESSAGES, ...messages };
    const settingsEntries = Object.entries(settings ?? {}) as [string, SettingDef<any>][];

    const AuthContext = createContext<AuthContextType<TUser> | undefined>(undefined);
    const UIContext = createContext<(BaseUIState & SettingValues<S> & SettingSetters<S>) | undefined>(undefined);
    const AppContext = createContext<AppContextType<TUser, S> | undefined>(undefined);

    /* ── Auth ── */
    const AuthProvider = ({ children, axiosInstance = defaultAxios, endpoints: override }: AppProviderProps) => {
      const endpoints = useMemo<AuthEndpoints>(
        () => ({ ...DEFAULT_ENDPOINTS, ...defaultEndpoints, ...override }),
        [override],
      );
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

      useEffect(() => { fetchUser(); }, [fetchUser]);

      useEffect(() => {
        const id = axiosInstance.interceptors.response.use(
          (r) => r,
          (err: AxiosError) => { if (err.response?.status === 401) setUser(null); return Promise.reject(err); },
        );
        return () => { axiosInstance.interceptors.response.eject(id); };
      }, [axiosInstance]);

      const hasUser = !!user;
      useEffect(() => {
        if (!hasUser || refreshOn.length === 0) return;
        const refresh = () => { void fetchUser(true); };
        const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
        if (refreshOn.includes('focus')) window.addEventListener('focus', refresh);
        if (refreshOn.includes('visibility')) document.addEventListener('visibilitychange', onVisibility);
        return () => {
          window.removeEventListener('focus', refresh);
          document.removeEventListener('visibilitychange', onVisibility);
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
        [user, loading, error, login, logout, refreshUser, clearError, changePassword],
      );
      return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    };

    /* ── UI + доп. настройки ── */
    const UIProvider = ({
      children,
      storagePrefix = defaultPrefix,
      defaultTheme = defaultThemeOpt,
      defaultLayout = defaultLayoutOpt,
      defaultPerPage = defaultPerPageOpt,
      settingDefaults,
    }: AppProviderProps) => {
      const [theme, setTheme] = usePersistentState<ThemeName>(`${storagePrefix}-theme`, defaultTheme,
        { validate: (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(themes, v) });
      const [layout, setLayout] = usePersistentState<LayoutMode>(`${storagePrefix}-layout`, defaultLayout,
        { validate: oneOf('horizontal', 'vertical') });
      const [perPage, setPerPage] = usePersistentState<number>(`${storagePrefix}-per-page`, defaultPerPage,
        { validate: (v) => typeof v === 'number' && Number.isInteger(v) && v > 0 });

      const extraValues: Record<string, unknown> = {};
      const extraSetters: Record<string, unknown> = {};
      // Схема фиксирована на этапе создания модуля → порядок хуков стабилен.
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
        [theme, layout, perPage, ...Object.values(extraValues)],
      );
      return <UIContext.Provider value={value as BaseUIState & SettingValues<S> & SettingSetters<S>}>{children}</UIContext.Provider>;
    };

    /* ── Фасад ── */
    const Bridge = ({ children }: { children: ReactNode }) => {
      const auth = useContext(AuthContext)!;
      const ui = useContext(UIContext)!;
      const value = useMemo(() => ({ ...auth, ...ui }) as AppContextType<TUser, S>, [auth, ui]);
      return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
    };

    const AppProvider = (props: AppProviderProps) => (
      <AuthProvider {...props}>
        <UIProvider {...props}>
          <ResponsiveProvider mobileBreakpoint={mobileBreakpoint}>
            <Bridge>{props.children}</Bridge>
          </ResponsiveProvider>
        </UIProvider>
      </AuthProvider>
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
    const useApp = (): AppContextType<TUser, S> => {
      const ctx = useContext(AppContext);
      if (!ctx) throw new Error('useApp must be used within AppProvider');
      return ctx;
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
      if (user.webAdmin) return <>{children}</>;
      if (!Array.isArray(user.allowedTabs)) return <>{children}</>;
      if (user.allowedTabs.includes(tabId)) return <>{children}</>;
      if (redirectTo && redirectTo !== tabId) return <Navigate to={redirectTo} replace />;
      return <>{noAccessNode}</>;
    };

    /* ── Привязанный PageLayout ── */
    const BoundPageLayout = ({ title, actions, children, padding, paddingBottom }: BoundPageLayoutProps) => {
      const { user, logout, theme, layout, setTheme, setLayout } = useApp();
      const [profileOpen, setProfileOpen] = useState(false);
      const canSeeProfile = !!profile && (profile.canSee?.(user) ?? (!!user && !user.webAdmin));
      const Modal = profile?.Modal;
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
          {canSeeProfile && Modal && (
            <Modal theme={themes[theme]} isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
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