import { useEffect, useCallback } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

type AuthEventType = 'login' | 'register' | 'logout' | 'session-expired' | 'unauthorized';

interface AuthEventCallback {
  (event: AuthEventType, data?: any): void | Promise<void>;
}

const authEventListeners: Map<string, AuthEventCallback[]> = new Map();

/**
 * Hook for subscribing to authentication events
 */
export function useAuthCallback(callback: AuthEventCallback) {
  const { isAuthenticated } = useJWTAuth();

  useEffect(() => {
    const listenerId = `listener_${Date.now()}_${Math.random()}`;
    
    if (!authEventListeners.has(listenerId)) {
      authEventListeners.set(listenerId, []);
    }
    
    authEventListeners.get(listenerId)?.push(callback);

    return () => {
      authEventListeners.delete(listenerId);
    };
  }, [callback]);
}

/**
 * Function to emit auth events
 */
export const emitAuthEvent = async (eventType: AuthEventType, data?: any) => {
  authEventListeners.forEach((callbacks) => {
    callbacks.forEach((cb) => {
      try {
        cb(eventType, data);
      } catch (err) {
        console.error(`Error in auth event callback for ${eventType}:`, err);
      }
    });
  });

  // Also log auth events
  if (typeof window !== 'undefined') {
    console.log(`[Auth Event] ${eventType}`, data || {});
    // Store event in sessionStorage for audit trail
    try {
      const authEvents = sessionStorage.getItem('authEvents') || '[]';
      const events = JSON.parse(authEvents);
      events.push({
        type: eventType,
        timestamp: new Date().toISOString(),
        data: data ? JSON.stringify(data) : null
      });
      // Keep only last 50 events
      if (events.length > 50) {
        events.shift();
      }
      sessionStorage.setItem('authEvents', JSON.stringify(events));
    } catch (err) {
      console.error('Failed to store auth event:', err);
    }
  }
};

/**
 * Get all recorded auth events
 */
export const getAuthEvents = () => {
  if (typeof window !== 'undefined') {
    try {
      const authEvents = sessionStorage.getItem('authEvents') || '[]';
      return JSON.parse(authEvents);
    } catch (err) {
      console.error('Failed to retrieve auth events:', err);
      return [];
    }
  }
  return [];
};

/**
 * Clear auth event log
 */
export const clearAuthEventLog = () => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('authEvents');
    } catch (err) {
      console.error('Failed to clear auth event log:', err);
    }
  }
};
