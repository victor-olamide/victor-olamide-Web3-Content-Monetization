import { useState, useCallback } from 'react';

export interface NavigationState {
  currentPath: string;
  previousPath?: string;
  isNavigating: boolean;
}

/**
 * useNavigation Hook
 * Manages navigation state and history
 */
export function useNavigation(initialPath: string = '/') {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPath: initialPath,
    previousPath: undefined,
    isNavigating: false
  });

  const navigate = useCallback((path: string) => {
    setNavigationState((prev) => ({
      currentPath: path,
      previousPath: prev.currentPath,
      isNavigating: false
    }));
  }, []);

  const goBack = useCallback(() => {
    if (navigationState.previousPath) {
      navigate(navigationState.previousPath);
    }
  }, [navigationState.previousPath, navigate]);

  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const canGoBack = navigationState.previousPath !== undefined;

  return {
    currentPath: navigationState.currentPath,
    previousPath: navigationState.previousPath,
    isNavigating: navigationState.isNavigating,
    navigate,
    goBack,
    goHome,
    canGoBack,
    isHome: navigationState.currentPath === '/'
  };
}

/**
 * Navigation Item Builder
 * Helper function to build navigation items consistently
 */
export function buildNavItem(
  id: string,
  label: string,
  path: string,
  icon?: React.ReactNode,
  options?: {
    badge?: number;
    isDanger?: boolean;
  }
) {
  return {
    id,
    label,
    path,
    icon,
    badge: options?.badge,
    isDanger: options?.isDanger
  };
}

/**
 * Standard Navigation Items
 * Provides default navigation structure
 */
export const STANDARD_NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: '🏠'
  },
  {
    id: 'browse',
    label: 'Browse',
    path: '/browse',
    icon: '🔍'
  },
  {
    id: 'cart',
    label: 'Cart',
    path: '/cart',
    icon: '🛒'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: '🔔'
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: '👤'
  }
];
