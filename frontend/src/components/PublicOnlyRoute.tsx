'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that only renders content if user is NOT authenticated
 * Redirects to dashboard if already logged in
 */
export function PublicOnlyRoute({
  children,
  fallback,
  redirectTo = '/dashboard'
}: PublicOnlyRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useJWTAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[PublicOnlyRoute] Authenticated user redirected to', redirectTo);
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  if (isLoading) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full"></div>
          </div>
        )}
      </>
    );
  }

  if (isAuthenticated) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper for pages that should only be accessible when not authenticated
 */
export function withPublicOnlyRoute<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function PublicOnlyWrapper(props: P) {
    return (
      <PublicOnlyRoute redirectTo={redirectTo}>
        <Component {...props} />
      </PublicOnlyRoute>
    );
  };
}
