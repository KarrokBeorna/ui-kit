import { useEffect } from 'react';

/**
 * Блокирует прокрутку body, пока active === true.
 * Возвращает исходное значение overflow при размонтировании.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [active]);
}