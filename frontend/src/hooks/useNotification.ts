/**
 * useNotification Hook
 * Hook for managing toast notifications
 */

import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';

export interface Notification {
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

interface UseNotificationReturn {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/**
 * useNotification Hook
 * Manages toast notification state and provides convenience methods
 *
 * Features:
 * - Add notifications to queue
 * - Remove notifications by ID
 * - Convenience methods for each type
 * - Auto-generate unique IDs
 * - Type-safe notification management
 *
 * Usage:
 * ```
 * const { showSuccess, showError, dismiss } = useNotification();
 *
 * showSuccess('Purchase Complete', 'Your purchase was successful');
 * showError('Purchase Failed', 'Please try again');
 * ```
 */
export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showNotification = useCallback(
    (notification: Omit<Notification, 'id'>) => {
      const id = generateId();
      const newNotification = {
        ...notification,
        id
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-dismiss if duration is specified and > 0
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, notification.duration);
      }

      return id;
    },
    [generateId]
  );

  const showSuccess = useCallback(
    (title: string, message?: string, duration = 4000) => {
      return showNotification({
        type: 'success',
        title,
        message,
        duration
      });
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message?: string, duration = 6000) => {
      return showNotification({
        type: 'error',
        title,
        message,
        duration
      });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string, duration = 5000) => {
      return showNotification({
        type: 'info',
        title,
        message,
        duration
      });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string, duration = 5000) => {
      return showNotification({
        type: 'warning',
        title,
        message,
        duration
      });
    },
    [showNotification]
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss,
    dismissAll
  };
};

/**
 * Notification Types for API Responses
 */
export interface ApiNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching notifications from API
 */
export const useFetchNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (page = 1, limit = 20, unreadOnly = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          unreadOnly: unreadOnly.toString()
        });

        const response = await fetch(`/api/notifications?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        setNotifications(data.data?.notifications || []);
        return data.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotification
  };
};
