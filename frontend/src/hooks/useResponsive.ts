import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  isLargeMobile: boolean;
  width: number;
  height: number;
}

/**
 * useResponsive Hook
 * Provides responsive breakpoint information and window dimensions
 * Breakpoints:
 * - Small Mobile: < 375px
 * - Mobile: < 768px
 * - Tablet: < 1024px
 * - Desktop: >= 1024px
 */
export function useResponsive(): ResponsiveBreakpoints {
  const [dimensions, setDimensions] = useState<ResponsiveBreakpoints>({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
    isSmallMobile: typeof window !== 'undefined' ? window.innerWidth < 375 : false,
    isLargeMobile: typeof window !== 'undefined' ? window.innerWidth >= 375 && window.innerWidth < 768 : false,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
        isSmallMobile: window.innerWidth < 375,
        isLargeMobile: window.innerWidth >= 375 && window.innerWidth < 768,
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Add debounce to prevent excessive updates
    let debounceTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(debounceTimer);
    };
  }, []);

  return dimensions;
}
