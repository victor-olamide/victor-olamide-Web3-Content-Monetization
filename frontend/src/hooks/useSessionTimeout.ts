import { useEffect, useRef, useCallback } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface UseSessionTimeoutOptions {
  warningTime?: number; // Time before timeout to show warning (in seconds)
  timeoutTime?: number; // Total session timeout (in seconds)
  onWarning?: () => void;
  onTimeout?: () => void;
}

const DEFAULT_WARNING_TIME = 5 * 60; // 5 minutes
const DEFAULT_TIMEOUT_TIME = 30 * 60; // 30 minutes

/**
 * Hook to handle session timeout and inactivity
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { 
    warningTime = DEFAULT_WARNING_TIME,
    timeoutTime = DEFAULT_TIMEOUT_TIME,
    onWarning,
    onTimeout
  } = options;

  const { logout, isAuthenticated } = useJWTAuth();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    // Clear existing timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    lastActivityRef.current = Date.now();

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      if (onWarning) {
        onWarning();
      }
      console.warn('[Session Timeout] Warning: session expiring soon');
    }, (timeoutTime - warningTime) * 1000);

    // Set logout timer
    inactivityTimerRef.current = setTimeout(() => {
      console.warn('[Session Timeout] Session expired due to inactivity');
      if (onTimeout) {
        onTimeout();
      }
      logout();
    }, timeoutTime * 1000);
  }, [isAuthenticated, timeoutTime, warningTime, onWarning, onTimeout, logout]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    // Events that reset the inactivity timer
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetTimeout();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [isAuthenticated, resetTimeout]);

  const getTimeRemaining = useCallback(() => {
    if (!isAuthenticated) return null;
    
    const now = Date.now();
    const timeSinceLastActivity = (now - lastActivityRef.current) / 1000;
    const timeRemaining = timeoutTime - timeSinceLastActivity;
    
    return Math.max(0, timeRemaining);
  }, [isAuthenticated, timeoutTime]);

  return {
    getTimeRemaining,
    resetTimeout,
    isSessionActive: isAuthenticated
  };
}
