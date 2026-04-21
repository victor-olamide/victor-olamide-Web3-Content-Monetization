'use client';

import React from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface AuthStatusProps {
  showEmail?: boolean;
  showRole?: boolean;
  showLoadingState?: boolean;
  compact?: boolean;
}

/**
 * Component to display current authentication status
 */
export function AuthStatus({
  showEmail = true,
  showRole = true,
  showLoadingState = true,
  compact = false
}: AuthStatusProps) {
  const { user, isAuthenticated, isLoading } = useJWTAuth();

  if (!showLoadingState && isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={compact ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
        <span className="inline-block animate-spin mr-2">⏳</span>
        Loading auth status...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={compact ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
        Not authenticated
      </div>
    );
  }

  return (
    <div className={compact ? 'text-xs' : 'text-sm'}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="font-medium text-gray-900">
          {user?.name || 'Authenticated User'}
        </span>
      </div>
      {showEmail && user?.email && (
        <div className="text-gray-600 mt-1">
          {user.email}
        </div>
      )}
      {showRole && user?.role && (
        <div className="text-gray-600 mt-1 capitalize">
          Role: <span className="font-medium">{user.role}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Component to conditionally render based on auth status
 */
interface AuthStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function AuthStatusIndicator({
  className,
  showDetails = false
}: AuthStatusIndicatorProps) {
  const { isAuthenticated, isLoading } = useJWTAuth();

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm ${className || ''}`}>
        <span className="inline-block animate-spin">⏳</span>
        <span>Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm ${className || ''}`}>
        <span className="inline-block">✓</span>
        <span>Authenticated</span>
        {showDetails && <AuthStatus compact showEmail={false} showRole={false} />}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm ${className || ''}`}>
      <span className="inline-block">✕</span>
      <span>Not Authenticated</span>
    </div>
  );
}
