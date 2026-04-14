'use client';

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
    if (duration === 0) return;
    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const getStyles = () => {
    const base = 'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 backdrop-blur-sm';
    const typeStyles = {
      success: 'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100',
      error: 'bg-red-50 border border-red-200 text-red-900 hover:bg-red-100',
      info: 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-900 hover:bg-yellow-100',
    };
    const anim = isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100';
    return `${base} ${typeStyles[type]} ${anim} ${className}`;
  };

  const getIcon = () => {
    const cls = 'flex-shrink-0 mt-0.5';
    switch (type) {
      case 'success': return <Check size={20} className={`${cls} text-green-600`} />;
      case 'error': return <AlertCircle size={20} className={`${cls} text-red-600`} />;
      case 'warning': return <AlertTriangle size={20} className={`${cls} text-yellow-600`} />;
      default: return <Info size={20} className={`${cls} text-blue-600`} />;
    }
  };

  return (
    <div className={getStyles()} role="alert" aria-live="polite">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
        {action && (
          <button
            onClick={() => { action.onClick(); handleClose(); }}
            className="text-xs font-medium mt-2 underline hover:no-underline transition-all"
          >
            {action.label}
          </button>
        )}
      </div>
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

export const ToastSuccess: React.FC<Omit<ToastProps, 'type'>> = (props) => <Toast {...props} type="success" />;
export const ToastError: React.FC<Omit<ToastProps, 'type'>> = (props) => <Toast {...props} type="error" />;
export const ToastInfo: React.FC<Omit<ToastProps, 'type'>> = (props) => <Toast {...props} type="info" />;
export const ToastWarning: React.FC<Omit<ToastProps, 'type'>> = (props) => <Toast {...props} type="warning" />;

/** @deprecated Use ToastSuccess instead */
export const ToastSuccesss = ToastSuccess;
