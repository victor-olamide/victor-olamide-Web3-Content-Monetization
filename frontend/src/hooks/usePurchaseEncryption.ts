/**
 * usePurchaseEncryption Hook
 * Integration between purchase flow and content encryption
 */

import { useCallback, useRef, useEffect } from 'react';
import useEncryption from './useEncryption';
import { useNotification } from './useNotification';
import { EncryptionAPIService } from '../utils/encryptionUtils';

export interface PurchaseEncryptionState {
  isPurchasing: boolean;
  isEncrypting: boolean;
  purchaseError: string | null;
  encryptionError: string | null;
  encryptedContentId: string | null;
  purchaseTransactionId: string | null;
}

export interface UsePurchaseEncryptionReturn {
  purchaseState: PurchaseEncryptionState;
  encryptPurchasedContent: (
    contentId: string,
    contentUrl: string,
    contentType: string,
    purchaseTransactionId: string,
    expiresInDays?: number
  ) => Promise<string>;
  handlePurchaseSuccess: (
    contentId: string,
    contentUrl: string,
    contentType: string,
    purchaseTransactionId: string
  ) => Promise<boolean>;
  handleRefund: (contentId: string, purchaseTransactionId: string) => Promise<boolean>;
  handleRenewal: (contentId: string, renewalDays?: number) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook for managing purchase-related content encryption
 */
export const usePurchaseEncryption = (): UsePurchaseEncryptionReturn => {
  const { notify } = useNotification();
  const { decryptContent, extendAccess, revokeAccess } = useEncryption();
  const purchaseState = useRef<PurchaseEncryptionState>({
    isPurchasing: false,
    isEncrypting: false,
    purchaseError: null,
    encryptionError: null,
    encryptedContentId: null,
    purchaseTransactionId: null
  });

  /**
   * Encrypt purchased content
   */
  const encryptPurchasedContent = useCallback(
    async (
      contentId: string,
      contentUrl: string,
      contentType: string,
      purchaseTransactionId: string,
      expiresInDays: number = 30
    ): Promise<string> => {
      purchaseState.current.isEncrypting = true;
      purchaseState.current.encryptionError = null;

      try {
        // Encrypt the content on the backend
        const encrypted = await EncryptionAPIService.encryptContent(
          contentId,
          contentUrl,
          contentType,
          expiresInDays
        );

        purchaseState.current.encryptedContentId = encrypted.id;
        purchaseState.current.purchaseTransactionId = purchaseTransactionId;
        purchaseState.current.isEncrypting = false;

        notify({
          type: 'success',
          title: 'Content Encrypted',
          message: 'Your purchased content is now securely encrypted'
        });

        return encrypted.id;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to encrypt content';
        purchaseState.current.encryptionError = errorMessage;
        purchaseState.current.isEncrypting = false;

        notify({
          type: 'error',
          title: 'Encryption Failed',
          message: errorMessage
        });

        throw error;
      }
    },
    [notify]
  );

  /**
   * Handle purchase success by encrypting content
   */
  const handlePurchaseSuccess = useCallback(
    async (
      contentId: string,
      contentUrl: string,
      contentType: string,
      purchaseTransactionId: string
    ): Promise<boolean> => {
      purchaseState.current.isPurchasing = true;
      purchaseState.current.purchaseError = null;

      try {
        // Encrypt content immediately after purchase
        const encryptedId = await encryptPurchasedContent(
          contentId,
          contentUrl,
          contentType,
          purchaseTransactionId,
          30 // Default 30 days access
        );

        // Verify encryption by checking access
        const hasAccess = await decryptContent(encryptedId).then(() => true).catch(() => false);

        if (!hasAccess) {
          throw new Error('Content encryption verification failed');
        }

        purchaseState.current.isPurchasing = false;

        notify({
          type: 'success',
          title: 'Purchase Complete',
          message: 'Your content is ready to access for 30 days'
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process purchase';
        purchaseState.current.purchaseError = errorMessage;
        purchaseState.current.isPurchasing = false;

        notify({
          type: 'error',
          title: 'Purchase Processing Failed',
          message: errorMessage
        });

        return false;
      }
    },
    [encryptPurchasedContent, decryptContent, notify]
  );

  /**
   * Handle refund by revoking access
   */
  const handleRefund = useCallback(
    async (contentId: string, purchaseTransactionId: string): Promise<boolean> => {
      purchaseState.current.isPurchasing = true;
      purchaseState.current.purchaseError = null;

      try {
        // Revoke content access on refund
        const success = await revokeAccess(contentId);

        if (!success) {
          throw new Error('Failed to revoke content access');
        }

        // Log refund for audit trail
        console.log(`Refund processed for transaction ${purchaseTransactionId}, content ${contentId}`);

        purchaseState.current.isPurchasing = false;

        notify({
          type: 'success',
          title: 'Refund Processed',
          message: 'Your access to the content has been revoked'
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
        purchaseState.current.purchaseError = errorMessage;
        purchaseState.current.isPurchasing = false;

        notify({
          type: 'error',
          title: 'Refund Processing Failed',
          message: errorMessage
        });

        return false;
      }
    },
    [revokeAccess, notify]
  );

  /**
   * Handle subscription renewal or access extension
   */
  const handleRenewal = useCallback(
    async (contentId: string, renewalDays: number = 30): Promise<boolean> => {
      purchaseState.current.isPurchasing = true;
      purchaseState.current.purchaseError = null;

      try {
        // Extend access on renewal
        const success = await extendAccess(contentId, renewalDays);

        if (!success) {
          throw new Error('Failed to extend content access');
        }

        purchaseState.current.isPurchasing = false;

        notify({
          type: 'success',
          title: 'Access Renewed',
          message: `Your access has been extended for ${renewalDays} days`
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process renewal';
        purchaseState.current.purchaseError = errorMessage;
        purchaseState.current.isPurchasing = false;

        notify({
          type: 'error',
          title: 'Renewal Failed',
          message: errorMessage
        });

        return false;
      }
    },
    [extendAccess, notify]
  );

  /**
   * Clear error messages
   */
  const clearError = useCallback(() => {
    purchaseState.current.purchaseError = null;
    purchaseState.current.encryptionError = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      purchaseState.current = {
        isPurchasing: false,
        isEncrypting: false,
        purchaseError: null,
        encryptionError: null,
        encryptedContentId: null,
        purchaseTransactionId: null
      };
    };
  }, []);

  return {
    purchaseState: purchaseState.current,
    encryptPurchasedContent,
    handlePurchaseSuccess,
    handleRefund,
    handleRenewal,
    clearError
  };
};

export default usePurchaseEncryption;
