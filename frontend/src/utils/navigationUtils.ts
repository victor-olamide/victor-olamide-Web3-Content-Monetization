/**
 * Navigation Utilities
 * Helper functions and constants for mobile navigation
 */

/**
 * Breakpoint Constants (in pixels)
 */
export const BREAKPOINTS = {
  SM: 375,      // Small mobile
  MD: 768,      // Mobile/Tablet
  LG: 1024,     // Tablet/Desktop
  XL: 1280,     // Large desktop
  XXL: 1536     // Extra large desktop
};

/**
 * Screen Size Constants
 */
export const SCREEN_SIZES = {
  SMALL_MOBILE: 'small_mobile',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

/**
 * Get screen size from width
 */
export function getScreenSize(width: number): string {
  if (width < BREAKPOINTS.SM) return SCREEN_SIZES.SMALL_MOBILE;
  if (width < BREAKPOINTS.MD) return SCREEN_SIZES.MOBILE;
  if (width < BREAKPOINTS.LG) return SCREEN_SIZES.TABLET;
  return SCREEN_SIZES.DESKTOP;
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.MD;
}

/**
 * Check if device is tablet
 */
export function isTabletDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth >= BREAKPOINTS.MD &&
    window.innerWidth < BREAKPOINTS.LG
  );
}

/**
 * Check if device is desktop
 */
export function isDesktopDevice(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.LG;
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Check if navigation drawer should be visible
 */
export function shouldShowNavigationDrawer(): boolean {
  return isMobileDevice();
}

/**
 * Check if bottom navigation should be visible
 */
export function shouldShowBottomNavigation(): boolean {
  const width = getViewportDimensions().width;
  return width < BREAKPOINTS.LG;
}

/**
 * Get safe area insets (for notched devices)
 */
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseFloat(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseFloat(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseFloat(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseFloat(style.getPropertyValue('--safe-area-inset-left') || '0')
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get optimal padding for mobile
 */
export function getMobilePadding(): string {
  const width = getViewportDimensions().width;
  if (width < BREAKPOINTS.SM) return 'px-2';
  if (width < BREAKPOINTS.MD) return 'px-3';
  return 'px-4';
}

/**
 * Get optimal gap for mobile
 */
export function getMobileGap(): string {
  const width = getViewportDimensions().width;
  if (width < BREAKPOINTS.SM) return 'gap-2';
  if (width < BREAKPOINTS.MD) return 'gap-3';
  return 'gap-4';
}

/**
 * Lock body scroll (for modals)
 */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = 'hidden';
}

/**
 * Unlock body scroll
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = 'unset';
}

/**
 * Check if touch is available (mobile/tablet)
 */
export function isTouchAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get device orientation
 */
export function getDeviceOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Format breadcrumb path
 */
export function formatBreadcrumbPath(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return ['Home', ...segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1))];
}

/**
 * Build breadcrumb items from path
 */
export function buildBreadcrumbsFromPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Home', path: '/' }];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path: currentPath,
      isActive: index === segments.length - 1
    });
  });

  return breadcrumbs;
}
