/**
 * useEncryption Hook
 * React hook for managing encrypted content access and decryption
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { EncryptionAPIService, formatExpirationDate, isContentAccessValid } from '../utils/encryptionUtils';
import { useNotification } from './useNotification';

export interface EncryptedContentState {
  contentId: string;
  contentUrl?: string;
  isDecrypted: boolean;
  isLoading: boolean;
  error: null | string;
  accessStatus: {
    isActive: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    expiresAt: string;
  } | null;
  accessAttempts: number;
  lastAccessedAt?: string;
}

export interface UseEncryptionReturn {
  contentState: EncryptedContentState;
  decryptContent: (contentId: string) => Promise<string>;
  verifyAccess: (contentId: string) => Promise<boolean>;
  checkStatus: (contentId: string) => Promise<boolean>;
  revokeAccess: (contentId: string) => Promise<boolean>;
  extendAccess: (contentId: string, additionalDays: number) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook for managing encrypted content access
 */
export const useEncryption = (initialContentId?: string): UseEncryptionReturn => {
  const { notify } = useNotification();
  const [contentState, setContentState] = useState<EncryptedContentState>({
    contentId: initialContentId || '',
    isDecrypted: false,
    isLoading: false,
    error: null,
    accessStatus: null,
    accessAttempts: 0
  });

  // Debounce timer for rapid requests
  const requestTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cleanup debounce on unmount
   */
  useEffect(() => {
    return () => {
      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current);
      }
    };
  }, []);

  /**
   * Decrypt content URL
   */
  const decryptContent = useCallback(
    async (contentId: string): Promise<string> => {
      // Clear any pending requests
      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current);
      }

      setContentState((prev) => ({
        ...prev,
        contentId,
        isLoading: true,
        error: null
      }));

      try {
        // Verify access first
        const accessStatus = await EncryptionAPIService.getContentStatus(contentId);

        // Check if access is valid
        if (!accessStatus.isActive || accessStatus.isExpired || accessStatus.isRevoked) {
          const statusText = accessStatus.isRevoked
            ? 'Access has been revoked'
            : accessStatus.isExpired
            ? 'Access has expired'
            : 'Access is not available';

          throw new Error(statusText);
        }

        // Decrypt content
        const decrypted = await EncryptionAPIService.decryptContent(contentId);

        setContentState((prev) => ({
          ...prev,
          contentUrl: decrypted.contentUrl,
          isDecrypted: true,
          isLoading: false,
          accessStatus,
          accessAttempts: decrypted.accessAttempts,
          lastAccessedAt: new Date().toISOString()
        }));

        notify({
          type: 'success',
          title: 'Content Unlocked',
          message: `Your content is accessible until ${formatExpirationDate(
            decrypted.expiresAt
          )}`
        });

        return decrypted.contentUrl;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to decrypt content';

        setContentState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isDecrypted: false
        }));

        notify({
          type: 'error',
          title: 'Decryption Failed',
          message: errorMessage
        });

        throw error;
      }
    },
    [notify]
  );

  /**
   * Verify access to content
   */
  const verifyAccess = useCallback(async (contentId: string): Promise<boolean> => {
    try {
      const status = await EncryptionAPIService.getContentStatus(contentId);

      setContentState((prev) => ({
        ...prev,
        contentId,
        accessStatus: status
      }));

      return status.isActive && !status.isExpired && !status.isRevoked;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify access';

      setContentState((prev) => ({
        ...prev,
        error: errorMessage
      }));

      return false;
    }
  }, []);

  /**
   * Check content access status
   */
  const checkStatus = useCallback(async (contentId: string): Promise<boolean> => {
    setContentState((prev) => ({
      ...prev,
      isLoading: true
    }));

    try {
      const status = await EncryptionAPIService.getContentStatus(contentId);

      setContentState((prev) => ({
        ...prev,
        contentId,
        isLoading: false,
        accessStatus: status,
        error: null
      }));

      return status.isActive && !status.isExpired && !status.isRevoked;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check status';

      setContentState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      return false;
    }
  }, []);

  /**
   * Revoke content access
   */
  const revokeAccess = useCallback(async (contentId: string): Promise<boolean> => {
    setContentState((prev) => ({
      ...prev,
      isLoading: true
    }));

    try {
      await EncryptionAPIService.revokeAccess(contentId);

      setContentState((prev) => ({
        ...prev,
        contentId,
        isLoading: false,
        isDecrypted: false,
        contentUrl: undefined,
        accessStatus: prev.accessStatus
          ? { ...prev.accessStatus, isActive: false }
          : null
      }));

      notify({
        type: 'success',
        title: 'Access Revoked',
        message: 'Content access has been revoked'
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke access';

      setContentState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      notify({
        type: 'error',
        title: 'Revocation Failed',
        message: errorMessage
      });

      return false;
    }
  }, [notify]);

  /**
   * Extend content access
   */
  const extendAccess = useCallback(
    async (contentId: string, additionalDays: number): Promise<boolean> => {
      if (additionalDays <= 0) {
        notify({
          type: 'warning',
          title: 'Invalid Duration',
          message: 'Extension duration must be greater than 0 days'
        });
        return false;
      }

      setContentState((prev) => ({
        ...prev,
        isLoading: true
      }));

      try {
        const result = await EncryptionAPIService.extendAccess(contentId, additionalDays);

        setContentState((prev) => ({
          ...prev,
          isLoading: false,
          accessStatus: prev.accessStatus
            ? { ...prev.accessStatus, expiresAt: result.newExpiresAt }
            : null
        }));

        notify({
          type: 'success',
          title: 'Access Extended',
          message: `Access extended for ${additionalDays} days`
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to extend access';

        setContentState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));

        notify({
          type: 'error',
          title: 'Extension Failed',
          message: errorMessage
        });

        return false;
      }
    },
    [notify]
  );

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setContentState((prev) => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setContentState({
      contentId: initialContentId || '',
      isDecrypted: false,
      isLoading: false,
      error: null,
      accessStatus: null,
      accessAttempts: 0
    });
  }, [initialContentId]);

  return {
    contentState,
    decryptContent,
    verifyAccess,
    checkStatus,
    revokeAccess,
    extendAccess,
    clearError,
    reset
  };
};

export default useEncryption;
