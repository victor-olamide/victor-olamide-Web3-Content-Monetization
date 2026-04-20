'use client';

import React from 'react';
import { JWTAuthProvider } from '@/contexts/JWTAuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

/**
 * Root app providers wrapper
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JWTAuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </JWTAuthProvider>
  );
}
