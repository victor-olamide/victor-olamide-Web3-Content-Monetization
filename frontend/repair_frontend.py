from pathlib import Path
base = Path('src')

files = {
    'pages/admin/hooks/useAnalyticsData.ts': """/**
 * Analytics Data Hook
 * Fetches and manages analytics data from the API
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../utils/adminApi';

export const useAnalyticsData = (dateRange, granularity) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getDashboardData({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        granularity,
      });

      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, granularity]);

  const fetchRealTimeData = useCallback(async () => {
    try {
      const response = await adminApi.getRealTimeMetrics();
      if (response.success) {
        setRealTimeData(response.data);
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchDashboardData();
    fetchRealTimeData();
  }, [fetchDashboardData, fetchRealTimeData]);

  const exportData = useCallback(async (format = 'json') => {
    try {
      const response = await adminApi.exportAnalyticsData({
        dataType: 'dashboard',
        format,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        console.log('Export initiated:', response.data);
      }
    } catch (err) {
      throw new Error('Export failed: ' + err.message);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  return {
    dashboardData,
    realTimeData,
    loading,
    error,
    refreshData,
    exportData,
  };
};

export const useUserAnalytics = (dateRange, granularity) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getUserBehaviorAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setUserData(response.data);
      } else {
        setError(response.message || 'Failed to fetch user analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching user analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    userData,
    loading,
    error,
    refetch: fetchUserData,
  };
};

export const useContentAnalytics = (dateRange, granularity) => {
  const [contentData, setContentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getContentPerformanceAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setContentData(response.data);
      } else {
        setError(response.message || 'Failed to fetch content analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching content analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchContentData();
  }, [fetchContentData]);

  return {
    contentData,
    loading,
    error,
    refetch: fetchContentData,
  };
};

export const useRevenueAnalytics = (dateRange, granularity) => {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getRevenueAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setRevenueData(response.data);
      } else {
        setError(response.message || 'Failed to fetch revenue analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  return {
    revenueData,
    loading,
    error,
    refetch: fetchRevenueData,
  };
};
""",
    'components/UploadContent.tsx': """'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useStorage } from '@/hooks/useStorage';
import { useAuth } from '@/contexts/AuthContext';
import { usePayPerView } from '@/hooks/usePayPerView';
import { useToast } from '@/contexts/ToastContext';

const UploadContent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentId, setContentId] = useState('');
  const [price, setPrice] = useState('');
  const [contentType, setContentType] = useState('video');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [storageType, setStorageType] = useState('gaia');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [tokenType, setTokenType] = useState<'sip-009' | 'sip-010'>('sip-009');
  const [tokenContract, setTokenContract] = useState('');
  const [minBalance, setMinBalance] = useState('1');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'idle' | 'storage' | 'metadata' | 'contract'>('idle');

  const { uploadToGaia, uploadToIPFS, uploadMetadata, uploading: storageUploading } = useStorage();
  const { addContent } = usePayPerView();
  const { stxAddress } = useAuth();
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  const uploading = storageUploading || uploadStep === 'contract';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const MAX_SIZE = 10 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE) {
        showWarning('File Too Large', `File size exceeds the 10MB limit. Please choose a smaller file.`);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !stxAddress) {
      showError('Cannot Upload', 'Please select a file and ensure your wallet is connected.');
      return;
    }

    if (!title || !contentId || !price) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSuccess(false);
      setError(null);
      setUploadStep('storage');

      const contentUrl = storageType === 'gaia'
        ? await uploadToGaia(file)
        : await uploadToIPFS(file);

      setUploadStep('metadata');
      const metadata = {
        title,
        description,
        contentType,
        tags: tags.split(',').map((t) => t.trim()),
        contentUrl,
        createdAt: Date.now(),
        creator: stxAddress,
        contentId: parseInt(contentId, 10),
        price: parseInt(price, 10),
        tokenGating: {
          enabled: isTokenGated,
          tokenType,
          tokenContract,
          minBalance: parseInt(minBalance, 10),
        },
      };

      const metadataUrl = await uploadMetadata(metadata, storageType as 'gaia' | 'ipfs');

      setUploadStep('contract');
      const txId = await addContent(parseInt(contentId, 10), parseInt(price, 10), metadataUrl);

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metadata,
          url: contentUrl,
          txId,
        }),
      });

      setUploadStep('idle');
      showSuccess('Content Published!', 'Your content has been successfully published.');
      setSuccess(true);
      setTitle('');
      setDescription('');
      setContentId('');
      setPrice('');
      setTags('');
      setFile(null);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(message);
      showError('Upload Failed', message);
    } finally {
      setUploadStep('idle');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4">Upload New Content</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Content Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Exclusive Video"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Numeric ID (for Contract)</label>
            <input
              type="number"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="1"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Tell your fans what this content is about..."
            rows={3}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="video">Video</option>
              <option value="article">Article</option>
              <option value="image">Image</option>
              <option value="music">Music</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (STX)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="10"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="music, exclusive, vip"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">File</label>
          <input
            type="file"
            accept="video/*,image/*,audio/*,text/plain"
            onChange={handleFileChange}
            className="mt-1 block w-full"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          {uploading ? 'Uploading...' : 'Publish Content'}
        </button>
        {success && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
            <CheckCircle className="inline-block mr-2" size={18} />
            Content published successfully.
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadContent;
""",
    'contexts/ToastContext.tsx': """'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '@/components/ToastContainer';
import { ToastType, TOAST_DURATIONS } from '@/components/Toast';

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
  const [toasts, setToasts] = useState<any[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, title, message, duration: TOAST_DURATIONS[type] }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export const useToastActions = () => {
  const { showSuccess, showError, showInfo, showWarning, dismissAll } = useToast();
  return { showSuccess, showError, showInfo, showWarning, dismissAll };
};
""",
    'utils/validationUtils.ts': """/**
 * Form validation utilities for authentication forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidateResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }

  return {
    isStrong: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validate login form
 */
export function validateLoginForm(data: { email: string; password: string }): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password || !data.password.trim()) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate registration form
 */
export function validateRegistrationForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password || !data.password.trim()) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!data.confirmPassword || !data.confirmPassword.trim()) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getFieldError(errors: ValidationError[], fieldName: string): string | null {
  const error = errors.find((e) => e.field === fieldName);
  return error ? error.message : null;
}

export function hasFieldError(errors: ValidationError[], fieldName: string): boolean {
  return errors.some((e) => e.field === fieldName);
}
""",
    'components/PurchaseHistory.tsx': """import React from 'react';

const PurchaseHistory: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Purchase History</h3>
      <p className="text-gray-500">Purchase history component - coming soon.</p>
    </div>
  );
};

export default PurchaseHistory;
""",
    'components/Toast.tsx': """'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  info: 5000,
  warning: 5000,
};

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
  className = '',
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration === 0) return undefined;

    const timer = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(() => onClose(id), 300);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    window.setTimeout(() => onClose(id), 300);
  };

  const getStyles = () => {
    const base = 'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 backdrop-blur-sm';
    const typeStyles = {
      success: 'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100',
      error: 'bg-red-50 border border-red-200 text-red-900 hover:bg-red-100',
      info: 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-900 hover:bg-yellow-100',
    };
    const animation = isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100';
    return `${base} ${typeStyles[type]} ${animation} ${className}`;
  };

  const getIcon = () => {
    const iconProps = { size: 20, className: 'flex-shrink-0 mt-0.5' };

    switch (type) {
      case 'success':
        return <Check {...iconProps} className={`${iconProps.className} text-green-600`} />;
      case 'error':
        return <AlertCircle {...iconProps} className={`${iconProps.className} text-red-600`} />;
      case 'warning':
        return <AlertTriangle {...iconProps} className={`${iconProps.className} text-yellow-600`} />;
      case 'info':
      default:
        return <Info {...iconProps} className={`${iconProps.className} text-blue-600`} />;
    }
  };

  return (
    <div className={getStyles()} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
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
""",
    'components/ToastContainer.tsx': """'use client';

import React from 'react';
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
  onDismissAll?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  maxToasts?: number;
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onDismissAll,
  position = 'top-right',
  maxToasts = 5,
  className = '',
}) => {
  const displayedToasts = toasts.slice(0, maxToasts);

  const getPositionClasses = () => {
    const base = 'fixed pointer-events-none z-50';
    const positions: Record<ToastContainerProps['position'], string> = {
      'top-left': 'top-4 left-4 flex flex-col gap-2',
      'top-right': 'top-4 right-4 flex flex-col gap-2',
      'bottom-left': 'bottom-4 left-4 flex flex-col-reverse gap-2',
      'bottom-right': 'bottom-4 right-4 flex flex-col-reverse gap-2',
      'top-center': 'top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-full max-w-md',
    };

    return `${base} ${positions[position]} ${className}`;
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
      {toasts.length > 1 && onDismissAll && (
        <div className="pointer-events-auto">
          <button
            onClick={onDismissAll}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-200 bg-white shadow-sm transition"
          >
            Dismiss all ({toasts.length})
          </button>
        </div>
      )}
      {toasts.length > maxToasts && (
        <div className="text-xs text-gray-500 px-4 py-2 pointer-events-auto">
          +{toasts.length - maxToasts} more notification{toasts.length - maxToasts !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export const TOAST_POSITIONS = {
  TOP_LEFT: 'top-left' as const,
  TOP_RIGHT: 'top-right' as const,
  TOP_CENTER: 'top-center' as const,
  BOTTOM_LEFT: 'bottom-left' as const,
  BOTTOM_RIGHT: 'bottom-right' as const,
};
""",
}

for relative_path, content in files.items():
    path = base / relative_path
    path.write_text(content, encoding='utf-8')
    print(f'Wrote {path}')
