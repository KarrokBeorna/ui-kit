import { createContext, useContext, ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface ResponsiveConfig {
  /** Верхняя граница мобильного диапазона, px. По умолчанию 640. */
  mobileBreakpoint?: number;
  /** Верхняя граница планшетного диапазона, px. По умолчанию 1024. */
  tabletBreakpoint?: number;
  /**
   * Принудительный режим — полезно для визуальных тестов и Storybook.
   * Если задан — matchMedia игнорируется.
   */
  forceMode?: 'mobile' | 'tablet' | 'desktop';
}

export interface ResponsiveValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: 'mobile' | 'tablet' | 'desktop';
}

const DEFAULT: ResponsiveConfig = {
  mobileBreakpoint: 640,
  tabletBreakpoint: 1024,
};

const ResponsiveContext = createContext<ResponsiveConfig>(DEFAULT);

export function ResponsiveProvider({
  children,
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  forceMode,
}: ResponsiveConfig & { children: ReactNode }) {
  return (
    <ResponsiveContext.Provider
      value={{ mobileBreakpoint, tabletBreakpoint, forceMode }}
    >
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive(): ResponsiveValue {
  const cfg = useContext(ResponsiveContext);
  const mobile = cfg.mobileBreakpoint ?? 640;
  const tablet = cfg.tabletBreakpoint ?? 1024;

  const isMobileQ = useMediaQuery(`(max-width: ${mobile}px)`);
  const isTabletQ = useMediaQuery(
    `(min-width: ${mobile + 1}px) and (max-width: ${tablet}px)`
  );

  if (cfg.forceMode === 'mobile') {
    return { isMobile: true, isTablet: false, isDesktop: false, width: 'mobile' };
  }
  if (cfg.forceMode === 'tablet') {
    return { isMobile: false, isTablet: true, isDesktop: false, width: 'tablet' };
  }
  if (cfg.forceMode === 'desktop') {
    return { isMobile: false, isTablet: false, isDesktop: true, width: 'desktop' };
  }

  return {
    isMobile: isMobileQ,
    isTablet: isTabletQ,
    isDesktop: !isMobileQ && !isTabletQ,
    width: isMobileQ ? 'mobile' : isTabletQ ? 'tablet' : 'desktop',
  };
}