'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastMessage, NOTIFICATION_DEFAULTS } from '@/components/ToastContainer';
import { ToastType } from '@/components/Toast';

interface ToastContextType {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
ToastContext.displayName = 'ToastContext';

let idCounter = 0;
const generateId = () => `toast-${++idCounter}-${Date.now()}`;

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxToasts = 5, position = 'top-right' }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const DURATIONS: Record<ToastType, number> = {
    success: NOTIFICATION_DEFAULTS.SUCCESS_DURATION,
    error: NOTIFICATION_DEFAULTS.ERROR_DURATION,
    info: NOTIFICATION_DEFAULTS.INFO_DURATION,
    warning: NOTIFICATION_DEFAULTS.WARNING_DURATION,
  };

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, title, message, duration: DURATIONS[type] }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showSuccess: (title, message) => add('success', title, message),
        showError: (title, message) => add('error', title, message),
        showInfo: (title, message) => add('info', title, message),
        showWarning: (title, message) => add('warning', title, message),
        dismiss,
        dismissAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

/**
 * Convenience hook that returns only the show* methods and dismissAll.
 * Useful when you only need to trigger toasts without reading state.
 */
export const useToastActions = () => {
  const { showSuccess, showError, showInfo, showWarning, dismissAll } = useToast();
  return { showSuccess, showError, showInfo, showWarning, dismissAll };
};

export type { ToastContextType };
