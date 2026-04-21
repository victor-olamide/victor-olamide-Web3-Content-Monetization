'use client';

import React, { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

interface SessionWarningProps {
  warningTime?: number;
  timeoutTime?: number;
  onExtendSession?: () => void;
}

/**
 * Component to display session timeout warning
 */
export function SessionWarning({
  warningTime = 5 * 60,
  timeoutTime = 30 * 60,
  onExtendSession
}: SessionWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { logout } = useJWTAuth();
  const { getTimeRemaining, resetTimeout } = useSessionTimeout({
    warningTime,
    timeoutTime,
    onWarning: () => setShowWarning(true)
  });

  // Update time remaining display
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining !== null && remaining <= 0) {
        setShowWarning(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, getTimeRemaining]);

  const handleExtend = () => {
    resetTimeout();
    setShowWarning(false);
    if (onExtendSession) {
      onExtendSession();
    }
  };

  const handleLogout = () => {
    logout();
    setShowWarning(false);
  };

  if (!showWarning) return null;

  const minutes = timeRemaining ? Math.floor(timeRemaining / 60) : 0;
  const seconds = timeRemaining ? Math.floor(timeRemaining % 60) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Session Expiring</h2>
        
        <p className="text-gray-700 mb-4">
          Your session will expire in{' '}
          <span className="font-semibold text-red-600">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </p>

        <p className="text-gray-600 text-sm mb-6">
          Click "Continue Session" to stay logged in or "Logout" to end your session now.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
          >
            Logout
          </button>
          <button
            onClick={handleExtend}
            className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
}
