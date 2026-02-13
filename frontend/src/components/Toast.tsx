/**
 * Toast Component
 * Notification display component with multiple types and animations
 */

import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Toast Component
 * Displays a single toast notification with auto-dismiss
 *
 * Features:
 * - Multiple notification types (success, error, info, warning)
 * - Auto-dismiss with customizable duration
 * - Action buttons support
 * - Smooth enter/exit animations
 * - Icon indicators
 * - Dismiss button
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
  className = ''
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration === 0) return; // Don't auto-dismiss if duration is 0

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getStyles = () => {
    const baseStyles =
      'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 backdrop-blur-sm';

    const typeStyles = {
      success:
        'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100',
      error: 'bg-red-50 border border-red-200 text-red-900 hover:bg-red-100',
      info: 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100',
      warning:
        'bg-yellow-50 border border-yellow-200 text-yellow-900 hover:bg-yellow-100'
    };

    const animationStyles = isExiting
      ? 'opacity-0 translate-x-full scale-95'
      : 'opacity-100 translate-x-0 scale-100';

    return `${baseStyles} ${typeStyles[type]} ${animationStyles} ${className}`;
  };

  const getIcon = () => {
    const iconProps = { size: 20, className: 'flex-shrink-0 mt-0.5' };

    switch (type) {
      case 'success':
        return <Check {...iconProps} className={`${iconProps.className} text-green-600`} />;
      case 'error':
        return (
          <AlertCircle {...iconProps} className={`${iconProps.className} text-red-600`} />
        );
      case 'warning':
        return (
          <AlertTriangle {...iconProps} className={`${iconProps.className} text-yellow-600`} />
        );
      case 'info':
      default:
        return <Info {...iconProps} className={`${iconProps.className} text-blue-600`} />;
    }
  };

  return (
    <div className={getStyles()} role="alert" aria-live="polite">
      {/* Icon */}
      <div className="flex-shrink-0">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}

        {/* Action Button */}
        {action && (
          <button
            onClick={() => {
              action.onClick();
              handleClose();
            }}
            className="text-xs font-medium mt-2 underline hover:no-underline transition-all"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * Toast variants for quick creation
 */
export const ToastSuccesss: React.FC<Omit<ToastProps, 'type'>> = (props) => (
  <Toast {...props} type="success" />
);

export const ToastError: React.FC<Omit<ToastProps, 'type'>> = (props) => (
  <Toast {...props} type="error" />
);

export const ToastInfo: React.FC<Omit<ToastProps, 'type'>> = (props) => (
  <Toast {...props} type="info" />
);

export const ToastWarning: React.FC<Omit<ToastProps, 'type'>> = (props) => (
  <Toast {...props} type="warning" />
);
