/**
 * Token management utilities for JWT authentication
 */

import { authApi } from './authApi';

interface TokenPayload {
  iat: number;
  exp: number;
  userId: string;
  email: string;
  role: string;
}

class TokenManager {
  private refreshTimeout: NodeJS.Timeout | null = null;
  private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Decode JWT token (without verification)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decoded = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      return decoded;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const now = Date.now() / 1000;
    return decoded.exp < now;
  }

  /**
   * Check if token is expiring soon (within buffer time)
   */
  static isTokenExpiringSoon(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const now = Date.now() / 1000;
    const expiryBuffer = TokenManager.TOKEN_EXPIRY_BUFFER / 1000;
    return decoded.exp < now + expiryBuffer;
  }

  /**
   * Get time until token expiry
   */
  static getTimeUntilExpiry(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded) return 0;

    const now = Date.now() / 1000;
    return Math.max(0, (decoded.exp - now) * 1000);
  }

  /**
   * Setup automatic token refresh
   */
  static setupAutoRefresh(token: string, onRefresh?: (newToken: string) => void) {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const timeUntilRefresh = this.getTimeUntilExpiry(token) - TokenManager.TOKEN_EXPIRY_BUFFER;

    if (timeUntilRefresh > 0) {
      this.refreshTimeout = setTimeout(async () => {
        try {
          const response = await authApi.refreshToken();
          if (response.success && response.accessToken) {
            onRefresh?.(response.accessToken);
            // Setup next refresh
            this.setupAutoRefresh(response.accessToken, onRefresh);
          }
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, timeUntilRefresh);
    }
  }

  /**
   * Clear auto refresh timeout
   */
  static clearAutoRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Get token expiry date
   */
  static getExpiryDate(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return new Date(decoded.exp * 1000);
  }

  /**
   * Get token claims
   */
  static getTokenClaims(token: string): Partial<TokenPayload> | null {
    return this.decodeToken(token);
  }
}

export default TokenManager;
