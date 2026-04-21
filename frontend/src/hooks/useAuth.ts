'use client';

import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { useSessionManagement } from './useSessionManagement';

/**
 * Custom hook combining JWT auth and session management
 */
export function useAuth() {
  const auth = useJWTAuth();
  const session = useSessionManagement();

  return {
    ...auth,
    ...session
  };
}

/**
 * Hook to check if user has specific role
 */
export function useCheckRole(role: string | string[]): boolean {
  const { user } = useJWTAuth();
  const roles = Array.isArray(role) ? role : [role];
  return user ? roles.includes(user.role) : false;
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin(): boolean {
  return useCheckRole('admin');
}

/**
 * Hook to check if user is a moderator
 */
export function useIsModerator(): boolean {
  return useCheckRole(['moderator', 'admin']);
}

/**
 * Hook to check if user is authenticated and can perform actions
 */
export function useCanPerformAction(): boolean {
  const { isAuthenticated, isLoading } = useJWTAuth();
  return isAuthenticated && !isLoading;
}
