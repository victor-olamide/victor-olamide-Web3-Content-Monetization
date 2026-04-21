import { useEffect, useCallback } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

/**
 * Hook to persist and recover authentication state
 */
export function useAuthPersistence() {
  const { user, isAuthenticated, verifyAuth } = useJWTAuth();
  const STORAGE_KEY = 'auth_state';
  const EXPIRY_KEY = 'auth_expiry';

  // Save auth state to localStorage
  const saveAuthState = useCallback(() => {
    if (typeof window !== 'undefined' && isAuthenticated && user) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          user,
          timestamp: new Date().toISOString()
        }));
        // Set 24-hour expiry
        sessionStorage.setItem(EXPIRY_KEY, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      } catch (err) {
        console.error('Failed to save auth state:', err);
      }
    }
  }, [user, isAuthenticated]);

  // Load auth state from localStorage
  const loadAuthState = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const expiry = sessionStorage.getItem(EXPIRY_KEY);
        
        if (stored && expiry) {
          const expiryDate = new Date(expiry);
          if (expiryDate > new Date()) {
            const parsed = JSON.parse(stored);
            return parsed.user;
          } else {
            // Expired, clear it
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(EXPIRY_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to load auth state:', err);
      }
    }
    return null;
  }, []);

  // Clear auth state from localStorage
  const clearAuthState = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(EXPIRY_KEY);
      } catch (err) {
        console.error('Failed to clear auth state:', err);
      }
    }
  }, []);

  // Auto-save when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      saveAuthState();
    } else {
      clearAuthState();
    }
  }, [isAuthenticated, user, saveAuthState, clearAuthState]);

  return {
    saveAuthState,
    loadAuthState,
    clearAuthState
  };
}
