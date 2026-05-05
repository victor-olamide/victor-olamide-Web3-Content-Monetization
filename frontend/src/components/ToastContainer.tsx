/**
 * ToastContainer Component
 * Container for managing and displaying multiple toast notifications
 */

import React, { ReactNode } from 'react';
import { Toast, ToastType } from './Toast';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  maxToasts?: number;
  className?: string;
}

/**
 * ToastContainer Component
 * Manages and displays multiple toast notifications with positioning
 *
 * Features:
 * - Multiple position options
 * - Maximum toast limit
 * - Queue management
 * - Responsive positioning
 * - Stacked display
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
  maxToasts = 5,
  className = ''
}) => {
  // Limit displayed toasts
  const displayedToasts = toasts.slice(0, maxToasts);

  const getPositionClasses = () => {
    const baseStyles = 'fixed pointer-events-none z-50';

    const positions = {
      'top-left': 'top-4 left-4 flex flex-col gap-2',
      'top-right': 'top-4 right-4 flex flex-col gap-2',
      'bottom-left': 'bottom-4 left-4 flex flex-col-reverse gap-2',
      'bottom-right': 'bottom-4 right-4 flex flex-col-reverse gap-2',
      'top-center': 'top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-full max-w-md'
    };

    return `${baseStyles} ${positions[position]} ${className}`;
  };

  return (
    <div className={getPositionClasses()} role="region" aria-live="polite" aria-label="Notifications">
      {displayedToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto max-w-sm">
          <Toast
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={onDismiss}
            action={toast.action}
          />
        </div>
      ))}

      {/* Queue indicator when toasts exceed max */}
      {toasts.length > maxToasts && (
        <div className="text-xs text-gray-500 px-4 py-2 pointer-events-auto">
          +{toasts.length - maxToasts} more notification{toasts.length - maxToasts !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

/**
 * Toast Position Presets
 */
export const TOAST_POSITIONS = {
  TOP_LEFT: 'top-left' as const,
  TOP_RIGHT: 'top-right' as const,
  TOP_CENTER: 'top-center' as const,
  BOTTOM_LEFT: 'bottom-left' as const,
  BOTTOM_RIGHT: 'bottom-right' as const
};

/**
 * Notification Configuration
 */
export const NOTIFICATION_DEFAULTS = {
  SUCCESS_DURATION: 4000,
  ERROR_DURATION: 6000,
  INFO_DURATION: 5000,
  WARNING_DURATION: 5000,
  PERMANENT_DURATION: 0 // Don't auto-dismiss
};
