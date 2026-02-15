import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RateLimitStatus,
  RateLimitTier,
  TierComparison,
  parseRateLimitHeaders,
  formatRetryAfter,
  getStatusColor
} from '../utils/rateLimitUtils';

/**
 * useRateLimit Hook
 * 
 * React hook for monitoring and managing rate limit status.
 * Provides real-time rate limit information and automatic retry logic.
 * 
 * @module hooks/useRateLimit
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface UseRateLimitOptions {
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
  /** Whether to automatically handle rate limit errors */
  autoRetry?: boolean;
  /** Maximum number of auto-retry attempts */
  maxRetries?: number;
  /** Endpoint to check rate limits for */
  endpoint?: string;
}

interface UseRateLimitReturn {
  /** Current rate limit status */
  status: RateLimitStatus | null;
  /** Available tiers */
  tiers: RateLimitTier[];
  /** Whether data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the user is currently rate limited */
  isRateLimited: boolean;
  /** Seconds until rate limit resets */
  retryAfter: number | null;
  /** Formatted retry after string */
  retryAfterFormatted: string | null;
  /** Current tier name */
  currentTier: string | null;
  /** Usage percentage (0-100) */
  usagePercentage: number;
  /** Status color for UI display */
  statusColor: string;
  /** Refresh rate limit status */
  refresh: () => Promise<void>;
  /** Fetch available tiers */
  fetchTiers: () => Promise<void>;
  /** Compare two tiers */
  compareTiers: (tierA: string, tierB: string) => Promise<TierComparison | null>;
  /** Process response headers for rate limit info */
  processResponseHeaders: (headers: Headers) => void;
}

/**
 * Hook for monitoring and managing rate limits
 * @param options - Configuration options
 * @returns Rate limit state and actions
 */
export function useRateLimit(options: UseRateLimitOptions = {}): UseRateLimitReturn {
  const {
    refreshInterval = 30000,
    autoRetry = false,
    maxRetries = 3,
    endpoint = '/api'
  } = options;

  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [tiers, setTiers] = useState<RateLimitTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch current rate limit status from the API
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/rate-limit/status?endpoint=${encodeURIComponent(endpoint)}`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(data.data);
          setIsRateLimited(false);
          setRetryAfter(null);
          retryCountRef.current = 0;
        }
      } else if (response.status === 429) {
        const data = await response.json();
        setIsRateLimited(true);
        setRetryAfter(data.retryAfter || null);

        if (autoRetry && retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          const delay = (data.retryAfter || 5) * 1000;
          retryTimerRef.current = setTimeout(() => refresh(), delay);
        }
      } else {
        setError(`Failed to fetch rate limit status: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rate limit status');
    } finally {
      setLoading(false);
    }
  }, [endpoint, autoRetry, maxRetries]);

  /**
   * Fetch available tier configurations
   */
  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rate-limit/tiers`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTiers(data.data.tiers);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tiers:', err);
    }
  }, []);

  /**
   * Compare two tiers
   */
  const compareTiersAction = useCallback(async (tierA: string, tierB: string): Promise<TierComparison | null> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rate-limit/tiers/compare?tierA=${tierA}&tierB=${tierB}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
      return null;
    } catch (err) {
      console.error('Failed to compare tiers:', err);
      return null;
    }
  }, []);

  /**
   * Process response headers for rate limit information
   */
  const processResponseHeaders = useCallback((headers: Headers) => {
    const rateLimitInfo = parseRateLimitHeaders(headers);

    if (rateLimitInfo.limit !== null) {
      setStatus(prev => ({
        ...prev,
        tier: rateLimitInfo.tier || prev?.tier || 'free',
        limits: {
          maxRequests: rateLimitInfo.limit || 0,
          windowMs: 900000,
          burstLimit: 0,
          burstWindowMs: 60000,
          dailyLimit: rateLimitInfo.dailyLimit || 0,
          concurrentLimit: 0
        },
        remaining: {
          window: rateLimitInfo.remaining || 0,
          burst: 0,
          daily: rateLimitInfo.dailyRemaining || 0,
          concurrent: 0
        },
        isBlocked: false,
        violations: 0
      } as RateLimitStatus));
    }

    if (rateLimitInfo.retryAfter !== null) {
      setIsRateLimited(true);
      setRetryAfter(rateLimitInfo.retryAfter);
    }
  }, []);

  // Auto-refresh on interval
  useEffect(() => {
    if (refreshInterval > 0) {
      refresh();
      const interval = setInterval(refresh, refreshInterval);
      return () => {
        clearInterval(interval);
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [refresh, refreshInterval]);

  // Calculate derived values
  const currentTier = status?.tier || null;
  const usagePercentage = status
    ? Math.round(
        ((status.limits?.maxRequests || 0) - (status.remaining?.window || 0)) /
        (status.limits?.maxRequests || 1) * 100
      )
    : 0;
  const statusColor = getStatusColor(usagePercentage);
  const retryAfterFormatted = retryAfter !== null ? formatRetryAfter(retryAfter) : null;

  return {
    status,
    tiers,
    loading,
    error,
    isRateLimited,
    retryAfter,
    retryAfterFormatted,
    currentTier,
    usagePercentage,
    statusColor,
    refresh,
    fetchTiers,
    compareTiers: compareTiersAction,
    processResponseHeaders
  };
}

export default useRateLimit;
