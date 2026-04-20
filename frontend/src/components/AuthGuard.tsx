'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

/**
 * HOC to protect routes requiring authentication
 */
export function ProtectedRoute({
  children,
  requiredRole
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useJWTAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (requiredRole && user && user.role !== requiredRole) {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, isLoading, requiredRole, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component to conditionally render content based on auth status
 */
export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAdmin = false,
  requireModerator = false
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useJWTAuth();

  // Role check
  if (requireAdmin && user?.role !== 'admin') {
    return fallback || null;
  }

  if (requireModerator && user?.role !== 'moderator' && user?.role !== 'admin') {
    return fallback || null;
  }

  if (isLoading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Component to render content only if user is NOT authenticated
 */
export interface UnauthenticatedGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function UnauthenticatedGuard({
  children,
  fallback
}: UnauthenticatedGuardProps) {
  const { isAuthenticated, isLoading } = useJWTAuth();

  if (isLoading) {
    return fallback || null;
  }

  if (isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Component for role-based rendering
 */
export interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  roles,
  fallback
}: RoleGuardProps) {
  const { isAuthenticated, isLoading, user } = useJWTAuth();

  if (isLoading) {
    return fallback || null;
  }

  if (!isAuthenticated || !user || !roles.includes(user.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}
