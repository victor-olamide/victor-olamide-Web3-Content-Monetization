/**
 * Comprehensive authentication service
 */

import { authApi, LoginCredentials, RegisterData, UserProfile } from './authApi';
import { getCookie, setCookie, deleteCookie } from './cookieUtils';
import TokenManager from './tokenManager';
import { AUTH_CONFIG } from '@/constants/auth';

class AuthService {
  /**
   * Initialize authentication service
   */
  async initialize() {
    const token = getCookie(AUTH_CONFIG.COOKIE_PATH);
    
    if (token && !TokenManager.isTokenExpired(token)) {
      // Setup auto-refresh for valid token
      this.setupTokenRefresh(token);
      return true;
    } else if (token) {
      // Token expired, clear it
      this.clearAuth();
    }
    
    return false;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials) {
    try {
      const response = await authApi.login(credentials);
      
      if (response.success && response.accessToken) {
        // Store tokens in httpOnly cookies (set by server)
        // Setup auto-refresh
        this.setupTokenRefresh(response.accessToken);
        return { success: true, user: response.user };
      }
      
      return { success: false, error: response.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData) {
    try {
      const response = await authApi.register(data);
      
      if (response.success && response.accessToken) {
        // Setup auto-refresh
        this.setupTokenRefresh(response.accessToken);
        return { success: true, user: response.user };
      }
      
      return { success: false, error: response.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await authApi.logout();
      this.clearAuth();
      return { success: true };
    } catch (error) {
      // Clear anyway even if API call fails
      this.clearAuth();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const response = await authApi.verifySession();
      return response.user || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>) {
    try {
      const response = await authApi.updateProfile(data);
      return { success: response.success, user: response.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile update failed'
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string) {
    try {
      const response = await authApi.changePassword(oldPassword, newPassword);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    try {
      const response = await authApi.requestPasswordReset(email);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const response = await authApi.resetPassword(token, newPassword);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reset failed'
      };
    }
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = getCookie(AUTH_CONFIG.COOKIE_PATH);
    
    if (!token || TokenManager.isTokenExpired(token)) {
      return false;
    }

    try {
      const response = await authApi.verifySession();
      return response.authenticated;
    } catch {
      return false;
    }
  }

  /**
   * Get remaining session time
   */
  getRemainingSessionTime(): number {
    const token = getCookie(AUTH_CONFIG.COOKIE_PATH);
    if (!token) return 0;
    return TokenManager.getTimeUntilExpiry(token);
  }

  /**
   * Check if session is about to expire
   */
  isSessionExpiringSoon(): boolean {
    const token = getCookie(AUTH_CONFIG.COOKIE_PATH);
    if (!token) return true;
    return TokenManager.isTokenExpiringSoon(token);
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(token: string) {
    TokenManager.setupAutoRefresh(token, (newToken: string) => {
      // Token refreshed, setup next refresh
      this.setupTokenRefresh(newToken);
    });
  }

  /**
   * Clear authentication data
   */
  private clearAuth() {
    TokenManager.clearAutoRefresh();
    deleteCookie(AUTH_CONFIG.COOKIE_PATH);
  }

  /**
   * Get decoded token claims
   */
  getTokenClaims() {
    const token = getCookie(AUTH_CONFIG.COOKIE_PATH);
    if (!token) return null;
    return TokenManager.getTokenClaims(token);
  }

  /**
   * Validate credentials format (client-side)
   */
  validateLoginCredentials(email: string, password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    if (!password) {
      errors.push('Password is required');
    }

    return { valid: errors.length === 0, errors };
  }
}

export const authService = new AuthService();
