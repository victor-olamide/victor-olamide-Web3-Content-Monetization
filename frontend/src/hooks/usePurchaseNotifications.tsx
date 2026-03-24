/**
 * Purchase Notification Integration
 * Hooks and utilities for integrating notifications with purchase flow
 */

import { useCallback, useState } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { NotificationTemplates } from '../context/NotificationContext';
import { notificationApi, handlePurchaseError } from '../utils/notificationUtils';

export interface PurchaseData {
  contentId: string;
  contentTitle: string;
  price: number;
  transactionId?: string;
}

export interface PurchaseResponse {
  success: boolean;
  data?: PurchaseData;
  error?: string;
  errorCode?: string;
}

/**
 * usePurchaseNotifications Hook
 * Manages notifications for purchase transactions
 *
 * Usage:
 * ```
 * const { processPurchase, isProcessing } = usePurchaseNotifications();
 *
 * const handleBuy = async (contentId) => {
 *   await processPurchase({
 *     contentId,
 *     contentTitle: 'My Content',
 *     price: 100
 *   });
 * };
 * ```
 */
export const usePurchaseNotifications = () => {
  const { showNotification } = useNotificationContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPurchase = useCallback(
    async (purchaseData: PurchaseData, onPurchase?: (data: PurchaseData) => Promise<void>) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Show processing notification
        const processingId = showNotification({
          type: 'info',
          title: '⏳ Processing Purchase',
          message: `Purchasing "${purchaseData.contentTitle}"...`,
          duration: 0
        });

        // Call purchase handler if provided
        if (onPurchase) {
          await onPurchase(purchaseData);
        }

        // Show success notification
        showNotification(
          NotificationTemplates.purchaseSuccess(purchaseData.contentTitle, purchaseData.price)
        );

        // Dismiss processing notification
        // (This would require dismissing by ID, but our simple implementation doesn't expose it)

        return { success: true, data: purchaseData };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Purchase failed');

        // Show error notification
        const errorMsg =
          err instanceof Error ? err.message : 'Your purchase could not be completed';
        showNotification(NotificationTemplates.purchaseError(errorMsg));

        return {
          success: false,
          error: errorMsg
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [showNotification]
  );

  const notifyRefund = useCallback(
    (contentTitle: string, refundAmount: number) => {
      showNotification({
        type: 'success',
        title: '✅ Refund Completed',
        message: `${refundAmount} STX refunded for "${contentTitle}"`,
        duration: 4000
      });
    },
    [showNotification]
  );

  const notifyWalletConnect = useCallback(() => {
    showNotification({
      type: 'success',
      title: '👛 Wallet Connected',
      message: 'Your wallet is now connected',
      duration: 3000
    });
  }, [showNotification]);

  const notifyInsufficientBalance = useCallback(
    (required: number, available: number) => {
      showNotification({
        type: 'error',
        title: '💳 Insufficient Balance',
        message: `You need ${required} STX but only have ${available} STX`,
        duration: 6000
      });
    },
    [showNotification]
  );

  return {
    processPurchase,
    notifyRefund,
    notifyWalletConnect,
    notifyInsufficientBalance,
    isProcessing,
    error
  };
};

/**
 * usePurchaseFlow Hook
 * Complete purchase flow with notifications
 *
 * Usage:
 * ```
 * const {
 *   processPurchase,
 *   isLoading,
 *   error
 * } = usePurchaseFlow('http://api.example.com');
 *
 * const handleClick = async () => {
 *   const result = await processPurchase({
 *     contentId: '123',
 *     contentTitle: 'Content Name',
 *     price: 100
 *   });
 * };
 * ```
 */
export const usePurchaseFlow = (apiUrl?: string) => {
  const { showSuccess, showError } = useNotificationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPurchase = useCallback(
    async (data: PurchaseData) => {
      setIsLoading(true);
      setError(null);

      try {
        // Make API call to purchase endpoint
        const endpoint = apiUrl ? `${apiUrl}/api/purchases` : '/api/purchases';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Purchase failed with status ${response.status}`
          );
        }

        const result = await response.json();

        // Show success notification
        showSuccess(
          '🎉 Purchase Successful!',
          `You successfully purchased "${data.contentTitle}" for ${data.price} STX`,
          4000
        );

        return {
          success: true,
          data: result.data || data
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Purchase failed. Please try again.';
        setError(errorMessage);

        // Show error notification
        showError('❌ Purchase Failed', errorMessage, 6000);

        return {
          success: false,
          error: errorMessage
        };
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, showSuccess, showError]
  );

  const processRefund = useCallback(
    async (contentId: string, contentTitle: string, refundAmount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = apiUrl ? `${apiUrl}/api/refunds` : '/api/refunds';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ contentId, refundAmount })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Refund processing failed');
        }

        // Show success notification
        showSuccess(
          '✅ Refund Completed',
          `${refundAmount} STX refunded for "${contentTitle}"`,
          4000
        );

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Refund processing failed';
        setError(errorMessage);

        showError('❌ Refund Failed', errorMessage, 6000);

        return {
          success: false,
          error: errorMessage
        };
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, showSuccess, showError]
  );

  return {
    processPurchase,
    processRefund,
    isLoading,
    error
  };
};

/**
 * withPurchaseNotifications HOC
 * Wraps a component to add purchase notification functionality
 *
 * Usage:
 * ```
 * const BuyButton = withPurchaseNotifications(({ processPurchase }) => (
 *   <button onClick={() => processPurchase(data)}>
 *     Buy Now
 *   </button>
 * ));
 * ```
 */
export function withPurchaseNotifications<P extends object>(
  Component: React.ComponentType<P & { processPurchase: (data: PurchaseData) => Promise<any> }>
) {
  return function PurchaseNotificationWrapper(props: P) {
    const { processPurchase } = usePurchaseNotifications();

    return <Component {...props} processPurchase={processPurchase} />;
  };
}

/**
 * Error boundary for purchase operations
 */
export const createPurchaseErrorHandler = () => {
  return (error: any, { showError }: { showError: (title: string, message: string) => void }) => {
    const notification = handlePurchaseError(error);
    showError(notification.title, notification.message);
  };
};
