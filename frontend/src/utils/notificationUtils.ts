/**
 * Notification Utilities
 * Helper functions for notification handling and API integration
 */

import { ToastType } from '../components/Toast';

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  PURCHASE_SUCCESS: 'purchase_success',
  PURCHASE_ERROR: 'purchase_error',
  REFUND: 'refund',
  LISTING_UPDATE: 'listing_update',
  SYSTEM: 'system',
  WALLET: 'wallet',
  NETWORK: 'network'
} as const;

/**
 * Map notification type to toast type
 */
export const getToastType = (notificationType: string): ToastType => {
  const typeMap: Record<string, ToastType> = {
    [NOTIFICATION_TYPES.PURCHASE_SUCCESS]: 'success',
    [NOTIFICATION_TYPES.PURCHASE_ERROR]: 'error',
    [NOTIFICATION_TYPES.REFUND]: 'success',
    [NOTIFICATION_TYPES.LISTING_UPDATE]: 'info',
    [NOTIFICATION_TYPES.SYSTEM]: 'info',
    [NOTIFICATION_TYPES.WALLET]: 'warning',
    [NOTIFICATION_TYPES.NETWORK]: 'error'
  };

  return typeMap[notificationType] || 'info';
};

/**
 * Get default duration for notification type
 */
export const getDefaultDuration = (type: string): number => {
  const durationMap: Record<string, number> = {
    [NOTIFICATION_TYPES.PURCHASE_SUCCESS]: 4000,
    [NOTIFICATION_TYPES.PURCHASE_ERROR]: 6000,
    [NOTIFICATION_TYPES.REFUND]: 5000,
    [NOTIFICATION_TYPES.LISTING_UPDATE]: 4000,
    [NOTIFICATION_TYPES.SYSTEM]: 5000,
    [NOTIFICATION_TYPES.WALLET]: 0, // Don't auto-dismiss
    [NOTIFICATION_TYPES.NETWORK]: 0 // Don't auto-dismiss
  };

  return durationMap[type] || 5000;
};

/**
 * Format notification message for display
 */
export const formatNotificationMessage = (
  type: string,
  title: string,
  metadata?: Record<string, any>
): string => {
  switch (type) {
    case NOTIFICATION_TYPES.PURCHASE_SUCCESS:
      return `You successfully purchased "${metadata?.contentTitle || 'content'}"`;
    case NOTIFICATION_TYPES.PURCHASE_ERROR:
      return metadata?.message || 'Your purchase could not be completed';
    case NOTIFICATION_TYPES.REFUND:
      return `${metadata?.refundAmount || '0'} STX refunded for "${metadata?.contentTitle || 'content'}"`;
    case NOTIFICATION_TYPES.LISTING_UPDATE:
      return `"${metadata?.title || 'Content'}" has been updated`;
    default:
      return title;
  }
};

/**
 * Notification API Service
 */
export class NotificationApiService {
  private baseUrl = '/api/notifications';
  private token = localStorage.getItem('token');

  /**
   * Fetch user notifications
   */
  async fetchNotifications(page = 1, limit = 20, unreadOnly = false) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unreadOnly: unreadOnly.toString()
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const response = await fetch(`${this.baseUrl}/unread-count`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get unread count');
      }

      const data = await response.json();
      return data.data?.unreadCount || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await fetch(`${this.baseUrl}/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to archive notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getStatistics() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get notification statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      throw error;
    }
  }
}

/**
 * Create a notification API service instance
 */
export const notificationApi = new NotificationApiService();

/**
 * Error message mapping
 */
export const ERROR_MESSAGES: Record<string, string> = {
  PURCHASE_FAILED: 'Purchase failed. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance. Please add more STX.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  WALLET_DISCONNECTED: 'Wallet disconnected. Please reconnect.',
  INVALID_TRANSACTION: 'Invalid transaction. Please try again.',
  TRANSACTION_TIMEOUT: 'Transaction timed out. Please try again.',
  REFUND_FAILED: 'Refund processing failed. Please contact support.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
};

/**
 * Handle purchase error and return notification
 */
export const handlePurchaseError = (error: any) => {
  let message = ERROR_MESSAGES.UNKNOWN_ERROR;

  if (error?.code === 'INSUFFICIENT_BALANCE') {
    message = ERROR_MESSAGES.INSUFFICIENT_BALANCE;
  } else if (error?.code === 'NETWORK_ERROR') {
    message = ERROR_MESSAGES.NETWORK_ERROR;
  } else if (error?.message) {
    message = error.message;
  }

  return {
    type: NOTIFICATION_TYPES.PURCHASE_ERROR,
    title: 'Purchase Failed',
    message
  };
};

/**
 * Handle wallet errors
 */
export const handleWalletError = (error: any) => {
  let message = ERROR_MESSAGES.UNKNOWN_ERROR;

  if (error?.code === 'WALLET_DISCONNECTED') {
    message = ERROR_MESSAGES.WALLET_DISCONNECTED;
  } else if (error?.message) {
    message = error.message;
  }

  return {
    type: NOTIFICATION_TYPES.WALLET,
    title: 'Wallet Error',
    message
  };
};

/**
 * Batch notification operations
 */
export const batchNotificationOps = {
  markMultipleAsRead: async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-multiple-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to mark multiple as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in batch mark read:', error);
      throw error;
    }
  },

  deleteMultiple: async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/delete-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to delete multiple notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in batch delete:', error);
      throw error;
    }
  }
};
