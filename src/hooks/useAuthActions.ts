import { useCallback } from 'react';

export interface UseAuthActionsOptions {
  /** Логаут. Обычно — метод из вашего AuthContext. */
  logout: () => Promise<void> | void;
  /** Опциональный navigate — если хотите редиректить после входа/выхода. */
  navigate?: (to: string) => void;
  /** Куда идти при клике «Войти». @default '/login' */
  signInPath?: string;
  /** Куда идти после успешного логаута. @default '/login' */
  signOutPath?: string;
}

/**
 * Возвращает обёртки над действиями авторизации,
 * совместимые с интерфейсом header'ов UI-Kit (onSignIn / onSignOut).
 *
 * Не зависит от react-router и от конкретного AuthContext —
 * всё инжектится через параметры.
 */
export function useAuthActions({
  logout,
  navigate,
  signInPath = '/login',
  signOutPath = '/login',
}: UseAuthActionsOptions) {
  const handleSignIn = useCallback(() => {
    navigate?.(signInPath);
  }, [navigate, signInPath]);

  const handleSignOut = useCallback(async () => {
    await logout();
    if (navigate) navigate(signOutPath);
  }, [logout, navigate, signOutPath]);

  return { handleSignIn, handleSignOut };
}