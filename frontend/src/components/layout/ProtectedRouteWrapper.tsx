'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/AuthGuard';

interface ProtectedRouteWrapperProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

export function ProtectedRouteWrapper({ children, requiredRole, fallback }: ProtectedRouteWrapperProps) {
  return (
    <ProtectedRoute requiredRole={requiredRole} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRouteWrapper;
