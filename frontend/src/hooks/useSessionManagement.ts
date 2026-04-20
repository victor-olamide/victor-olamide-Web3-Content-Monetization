'use client';

import { useEffect, useCallback } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import TokenManager from '@/utils/tokenManager';
import { getCookie, setCookie } from '@/utils/cookieUtils';

/**
 * Hook to manage session and token refresh
 */
export function useSessionManagement() {
  const { logout, verifyAuth } = useJWTAuth();

  /**
   * Setup session monitoring
   */
  useEffect(() => {
    const setupSessionMonitoring = async () => {
      const token = getCookie('accessToken');
      if (!token) return;

      // Check if token is expired
      if (TokenManager.isTokenExpired(token)) {
        await logout();
        return;
      }

      // Setup auto-refresh
      TokenManager.setupAutoRefresh(token, (newToken: string) => {
        setCookie('accessToken', newToken);
      });
    };

    setupSessionMonitoring();

    // Cleanup on unmount
    return () => {
      TokenManager.clearAutoRefresh();
    };
  }, [logout]);

  /**
   * Check session validity
   */
  const checkSession = useCallback(async () => {
    const token = getCookie('accessToken');
    if (!token) {
      await logout();
      return false;
    }

    if (TokenManager.isTokenExpired(token)) {
      await logout();
      return false;
    }

    try {
      await verifyAuth();
      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  }, [logout, verifyAuth]);

  /**
   * Get session information
   */
  const getSessionInfo = useCallback(() => {
    const token = getCookie('accessToken');
    if (!token) return null;

    return {
      token,
      claims: TokenManager.getTokenClaims(token),
      expiryDate: TokenManager.getExpiryDate(token),
      isExpired: TokenManager.isTokenExpired(token),
      isExpiringSoon: TokenManager.isTokenExpiringSoon(token),
      timeUntilExpiry: TokenManager.getTimeUntilExpiry(token)
    };
  }, []);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async () => {
    try {
      await verifyAuth();
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }, [verifyAuth]);

  return {
    checkSession,
    getSessionInfo,
    refreshSession,
    logout
  };
}

/**
 * Hook to detect inactivity and logout
 */
export function useInactivityLogout(timeoutMinutes = 30) {
  const { logout } = useJWTAuth();
  
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);

      // Warning after (timeout - 5 minutes)
      warningTimer = setTimeout(() => {
        console.warn('Session will expire soon due to inactivity');
        // Could dispatch event or show notification here
      }, (timeoutMinutes - 5) * 60 * 1000);

      // Logout after timeout
      inactivityTimer = setTimeout(() => {
        logout();
      }, timeoutMinutes * 60 * 1000);
    };

    // Event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Initial timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [logout, timeoutMinutes]);
}

/**
 * Hook to use with API calls for automatic token refresh on 401
 */
export function useAuthenticatedFetch() {
  const { logout } = useJWTAuth();

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = getCookie('accessToken');

      if (!token) {
        await logout();
        throw new Error('No authentication token found');
      }

      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      } as Record<string, string>;

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      // If 401, logout user
      if (response.status === 401) {
        await logout();
        throw new Error('Authentication failed');
      }

      return response;
    },
    [logout]
  );

  return { fetchWithAuth };
}
