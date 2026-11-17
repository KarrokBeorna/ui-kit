import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useMediaQuery } from './useMediaQuery';

export interface ResponsiveConfig {
  /** Верхняя граница мобильного диапазона, px. @default 640 */
  mobileBreakpoint?: number;
  /** Верхняя граница планшетного диапазона, px. @default 1024 */
  tabletBreakpoint?: number;
  /** Принудительный режим (Storybook / визуальные тесты). */
  forceMode?: 'mobile' | 'tablet' | 'desktop';
}

export interface ResponsiveValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: 'mobile' | 'tablet' | 'desktop';
  /** Устройство с hover-указателем (мышь/trackpad). Управляет :hover-эффектами. */
  hasHover: boolean;
  /** Основной указатель — touch. Управляет размером тач-таргетов. */
  isTouch: boolean;
  /** Пользователь предпочитает reduced motion. Отключайте анимации. */
  prefersReducedMotion: boolean;
}

const DEFAULT_VALUE: ResponsiveValue = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 'desktop',
  hasHover: true,
  isTouch: false,
  prefersReducedMotion: false,
};

const ResponsiveContext = createContext<ResponsiveValue>(DEFAULT_VALUE);

export function ResponsiveProvider({
  children,
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  forceMode,
}: ResponsiveConfig & { children: ReactNode }) {
  // Один набор подписок на всё приложение.
  // isTablet выводится из пары (isMobile, isTabletQ) — экономим один matchMedia.
  const isMobileQ = useMediaQuery(`(max-width: ${mobileBreakpoint}px)`);
  const isTabletQ = useMediaQuery(`(max-width: ${tabletBreakpoint}px)`);
  const hasHoverQ = useMediaQuery('(hover: hover)');
  const isTouchQ = useMediaQuery('(pointer: coarse)');
  const reducedMotionQ = useMediaQuery('(prefers-reduced-motion: reduce)');

  const value = useMemo<ResponsiveValue>(() => {
    if (forceMode === 'mobile') {
      return {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 'mobile',
        hasHover: false,
        isTouch: true,
        prefersReducedMotion: reducedMotionQ,
      };
    }
    if (forceMode === 'tablet') {
      return {
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 'tablet',
        hasHover: hasHoverQ,
        isTouch: isTouchQ,
        prefersReducedMotion: reducedMotionQ,
      };
    }
    if (forceMode === 'desktop') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 'desktop',
        hasHover: true,
        isTouch: false,
        prefersReducedMotion: reducedMotionQ,
      };
    }

    const isMobile = isMobileQ;
    const isTablet = !isMobileQ && isTabletQ;
    const isDesktop = !isTabletQ;

    return {
      isMobile,
      isTablet,
      isDesktop,
      width: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      hasHover: hasHoverQ,
      isTouch: isTouchQ,
      prefersReducedMotion: reducedMotionQ,
    };
  }, [isMobileQ, isTabletQ, hasHoverQ, isTouchQ, reducedMotionQ, forceMode]);

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive(): ResponsiveValue {
  return useContext(ResponsiveContext);
}