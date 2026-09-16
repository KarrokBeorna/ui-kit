import { useCallback } from 'react';

/**
 * Обёртка для навигации по табам без зависимости от react-router-dom.
 *
 * Использование в приложении:
 *   const navigate = useNavigate();
 *   const { handleTabChange } = useTabNavigation(navigate);
 *
 * Хук намеренно принимает функцию `navigate` извне, чтобы UI-Kit
 * не тянул за собой router.
 */
export function useTabNavigation(navigate: (to: string) => void) {
  const handleTabChange = useCallback(
    (id: string) => {
      navigate(id);
    },
    [navigate]
  );

  return { handleTabChange };
}