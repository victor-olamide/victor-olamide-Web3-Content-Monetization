import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface UseAuthProtectionOptions {
  redirectTo?: string;
  requiredRole?: string;
  onUnauthorized?: () => void;
}

/**
 * Hook to protect routes and handle authentication requirements
 */
export function useAuthProtection(options: UseAuthProtectionOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useJWTAuth();
  const { 
    redirectTo = '/auth/login',
    requiredRole,
    onUnauthorized
  } = options;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // User not authenticated, redirect to login
      const loginUrl = redirectTo + `?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`;
      router.push(loginUrl);
      return;
    }

    if (requiredRole && user && user.role !== requiredRole) {
      // User doesn't have required role
      if (onUnauthorized) {
        onUnauthorized();
      }
      router.push('/unauthorized');
    }
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, router, onUnauthorized]);

  return {
    isAuthenticated,
    isLoading,
    user,
    hasRequiredRole: !requiredRole || user?.role === requiredRole
  };
}
