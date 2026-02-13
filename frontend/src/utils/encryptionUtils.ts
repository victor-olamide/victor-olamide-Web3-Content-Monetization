/**
 * Frontend Encryption Utilities
 * Client-side helpers for encrypted content access
 */

// Encryption configuration
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 12,
  tagLength: 16
};

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const ENCRYPTION_API = `${API_BASE}/api/encryption`;

/**
 * Check if a string is valid hex
 */
export const isValidHex = (str: string): boolean => {
  return /^[0-9a-f]*$/i.test(str);
};

/**
 * Convert string to hex
 */
export const stringToHex = (str: string): string => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
};

/**
 * Convert hex to string
 */
export const hexToString = (hex: string): string => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

/**
 * Validate encrypted content object
 */
export const isValidEncryptedContent = (content: any): boolean => {
  return (
    content &&
    typeof content.encryptedData === 'string' &&
    typeof content.iv === 'string' &&
    typeof content.authTag === 'string' &&
    isValidHex(content.encryptedData) &&
    isValidHex(content.iv) &&
    isValidHex(content.authTag)
  );
};

/**
 * API Service for encryption operations
 */
export class EncryptionAPIService {
  /**
   * Encrypt content URL
   */
  static async encryptContent(
    contentId: string,
    contentUrl: string,
    contentType: string,
    expiresInDays: number = 30
  ): Promise<{ id: string; contentId: string; expiresAt: string }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/encrypt-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          contentId,
          contentUrl,
          contentType,
          expiresIn: expiresInDays * 86400
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to encrypt content');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error encrypting content:', error);
      throw error;
    }
  }

  /**
   * Decrypt content URL
   */
  static async decryptContent(contentId: string): Promise<{
    contentUrl: string;
    accessAttempts: number;
    expiresAt: string;
  }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/decrypt-content/${contentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decrypt content');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error decrypting content:', error);
      throw error;
    }
  }

  /**
   * Get content access status
   */
  static async getContentStatus(contentId: string): Promise<{
    isActive: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    expiresAt: string;
  }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/content-status/${contentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get content status');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error getting content status:', error);
      throw error;
    }
  }

  /**
   * Get all user's encrypted contents
   */
  static async getUserContents(options: {
    limit?: number;
    skip?: number;
    activeOnly?: boolean;
  } = {}): Promise<{
    contents: any[];
    pagination: { total: number; limit: number; skip: number };
  }> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 20).toString(),
        skip: (options.skip || 0).toString(),
        activeOnly: (options.activeOnly !== false).toString()
      });

      const response = await fetch(`${ENCRYPTION_API}/my-contents?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch contents');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error fetching user contents:', error);
      throw error;
    }
  }

  /**
   * Revoke content access
   */
  static async revokeAccess(contentId: string): Promise<{ revokedCount: number }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/revoke-access/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke access');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error revoking access:', error);
      throw error;
    }
  }

  /**
   * Extend content access
   */
  static async extendAccess(
    contentId: string,
    additionalDays: number
  ): Promise<{ contentId: string; newExpiresAt: string }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/extend-access/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          additionalSeconds: additionalDays * 86400
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extend access');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error extending access:', error);
      throw error;
    }
  }

  /**
   * Get encryption statistics (admin only)
   */
  static async getStats(): Promise<{
    totalEncrypted: number;
    activeAccess: number;
    expiredAccess: number;
    revokedAccess: number;
  }> {
    try {
      const response = await fetch(`${ENCRYPTION_API}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Admin access required');
      }

      return (await response.json()).data;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

/**
 * Format expiration date for display
 */
export const formatExpirationDate = (expiresAt: string): string => {
  const date = new Date(expiresAt);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Expired';
  } else if (diffDays === 0) {
    return 'Expires today';
  } else if (diffDays === 1) {
    return 'Expires tomorrow';
  } else if (diffDays <= 7) {
    return `Expires in ${diffDays} days`;
  } else {
    return `Expires on ${date.toLocaleDateString()}`;
  }
};

/**
 * Check if content access is still valid
 */
export const isContentAccessValid = (expiresAt: string): boolean => {
  return new Date(expiresAt) > new Date();
};

/**
 * Get access status badge color
 */
export const getAccessStatusColor = (isActive: boolean, isExpired: boolean): string => {
  if (!isActive) return 'gray';
  if (isExpired) return 'red';
  return 'green';
};

/**
 * Get access status text
 */
export const getAccessStatusText = (
  isActive: boolean,
  isExpired: boolean,
  isRevoked: boolean
): string => {
  if (isRevoked) return 'Revoked';
  if (!isActive || isExpired) return 'Expired';
  return 'Active';
};

export default EncryptionAPIService;
