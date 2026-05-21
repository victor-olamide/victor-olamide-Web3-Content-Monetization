'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, UserProfile } from '@/utils/authApi';
import { getCookie, deleteCookie } from '@/utils/cookieUtils';

export interface JWTAuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

const JWTAuthContext = createContext<JWTAuthContextType | undefined>(undefined);

export const JWTAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  /**
   * Verify authentication on mount and when needed
   */
  const verifyAuth = useCallback(async () => {
    if (isCheckingAuth) return;
    setIsCheckingAuth(true);

    try {
      const result = await authApi.verifySession();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setError(null);
        // Store auth state in sessionStorage for quick recovery
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('authVerified', 'true');
          sessionStorage.setItem('userEmail', result.user.email || '');
        }
      } else {
        setUser(null);
        // Clear auth state from sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('authVerified');
          sessionStorage.removeItem('userEmail');
        }
        // Only set error if there's a specific error message
        if (result.error && result.error !== 'Session verification failed') {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authVerified');
        sessionStorage.removeItem('userEmail');
      }
    } finally {
      setIsCheckingAuth(false);
      setIsLoading(false);
    }
  }, [isCheckingAuth]);

  /**
   * Verify auth on mount
   */
  useEffect(() => {
    verifyAuth();
  }, []);

  /**
   * Handle login
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login({ email, password });

      if (response.success && response.user) {
        setUser(response.user);
        return true;
      } else {
        setError(response.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle registration
   */
  const register = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register({
        email,
        password,
        confirmPassword: password,
        name
      });

      if (response.success && response.user) {
        setUser(response.user);
        return true;
      } else {
        setError(response.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle logout
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.logout();
      setUser(null);
      // Clear auth cookies
      deleteCookie('accessToken');
      deleteCookie('refreshToken');
      
      // Clear auth-related session data
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authVerified');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('auth_state');
        sessionStorage.removeItem('auth_expiry');
        sessionStorage.removeItem('lastLoginTime');
        sessionStorage.removeItem('signupTime');
      }
      
      // Emit logout event for listeners
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('auth:logout', { detail: { timestamp: new Date().toISOString() } });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.updateProfile(data);

      if (response.success && response.user) {
        setUser(response.user);
        return true;
      } else {
        setError(response.message || 'Profile update failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: JWTAuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    verifyAuth,
    clearError,
    updateProfile
  };

  return (
    <JWTAuthContext.Provider value={value}>{children}</JWTAuthContext.Provider>
  );
};

/**
 * Hook to use JWT auth context
 */
export function useJWTAuth(): JWTAuthContextType {
  const context = useContext(JWTAuthContext);
  if (context === undefined) {
    throw new Error('useJWTAuth must be used within a JWTAuthProvider');
  }
  return context;
}
