/**
 * NotificationProvider & NotificationContext
 * Global notification state management
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useNotification } from '../hooks/useNotification';
import { Notification } from '../hooks/useNotification';
import { ToastContainer, TOAST_POSITIONS } from '../components/ToastContainer';
import { ToastType } from '../components/Toast';

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export interface NotificationProviderProps {
  children: ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  maxToasts?: number;
}

/**
 * NotificationProvider Component
 * Provides global notification context and manages toast display
 *
 * Features:
 * - Global notification state
 * - Centralized toast management
 * - Automatic container rendering
 * - Configurable position and max toasts
 * - Easy-to-use convenience methods
 *
 * Usage:
 * ```
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 *
 * // In child components:
 * const { showSuccess } = useNotificationContext();
 * showSuccess('Success', 'Operation completed');
 * ```
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = TOAST_POSITIONS.TOP_RIGHT,
  maxToasts = 5
}) => {
  const {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss,
    dismissAll
  } = useNotification();

  const value: NotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss,
    dismissAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={notifications}
        onDismiss={dismiss}
        position={position}
        maxToasts={maxToasts}
      />
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 * Must be used within NotificationProvider
 */
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }

  return context;
};

/**
 * Shorthand hooks for common notification types
 */
export const useToast = () => {
  const context = useNotificationContext();

  return {
    success: context.showSuccess,
    error: context.showError,
    info: context.showInfo,
    warning: context.showWarning,
    dismiss: context.dismiss,
    dismissAll: context.dismissAll
  };
};

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  purchaseSuccess: (contentTitle: string, price: number) => ({
    type: 'success' as ToastType,
    title: '🎉 Purchase Successful!',
    message: `You successfully purchased "${contentTitle}" for ${price} STX`,
    duration: 4000
  }),

  purchaseError: (errorMessage: string) => ({
    type: 'error' as ToastType,
    title: '❌ Purchase Failed',
    message: errorMessage || 'Your purchase could not be completed. Please try again.',
    duration: 6000
  }),

  refundProcessing: (contentTitle: string) => ({
    type: 'info' as ToastType,
    title: '⏳ Refund Processing',
    message: `Your refund for "${contentTitle}" is being processed`,
    duration: 5000
  }),

  refundSuccess: (contentTitle: string, amount: number) => ({
    type: 'success' as ToastType,
    title: '✅ Refund Completed',
    message: `${amount} STX refunded for "${contentTitle}"`,
    duration: 4000
  }),

  networkError: () => ({
    type: 'error' as ToastType,
    title: '🌐 Network Error',
    message: 'Failed to connect to the network. Please check your connection.',
    duration: 0 // Don't auto-dismiss
  }),

  walletNotConnected: () => ({
    type: 'warning' as ToastType,
    title: '👛 Wallet Not Connected',
    message: 'Please connect your wallet to proceed',
    duration: 0
  }),

  insufficientBalance: (required: number, available: number) => ({
    type: 'error' as ToastType,
    title: '💳 Insufficient Balance',
    message: `You need ${required} STX but only have ${available} STX available`,
    duration: 6000
  }),

  transactionPending: () => ({
    type: 'info' as ToastType,
    title: '⏳ Transaction Pending',
    message: 'Your transaction is being processed',
    duration: 0
  }),

  transactionConfirmed: () => ({
    type: 'success' as ToastType,
    title: '✅ Transaction Confirmed',
    message: 'Your transaction has been confirmed on the blockchain',
    duration: 4000
  }),

  copied: (text?: string) => ({
    type: 'success' as ToastType,
    title: '📋 Copied',
    message: text ? `${text} copied to clipboard` : 'Copied to clipboard',
    duration: 2000
  }),

  loading: (message: string) => ({
    type: 'info' as ToastType,
    title: '⏳ Loading',
    message,
    duration: 0
  }),

  error: (title: string, message?: string) => ({
    type: 'error' as ToastType,
    title,
    message: message || 'Something went wrong',
    duration: 6000
  }),

  warning: (title: string, message?: string) => ({
    type: 'warning' as ToastType,
    title,
    message: message || 'Please be careful',
    duration: 5000
  }),

  info: (title: string, message?: string) => ({
    type: 'info' as ToastType,
    title,
    message,
    duration: 5000
  })
};
