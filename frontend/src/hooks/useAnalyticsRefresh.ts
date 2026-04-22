'use client';

import { useCallback, useRef, useState } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoRefresh(onRefresh: () => Promise<void>, options: UseAutoRefreshOptions = {}) {
  const { interval = 5 * 60 * 1000, enabled = false } = options; // 5 minutes default
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefresh(new Date());
      setNextRefresh(new Date(Date.now() + interval));
    } catch (error) {
      console.error('Auto-refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, interval]);

  const scheduleNextRefresh = useCallback(() => {
    if (!enabled) return;

    timeoutRef.current = setTimeout(() => {
      refresh().then(() => scheduleNextRefresh());
    }, interval);

    setNextRefresh(new Date(Date.now() + interval));
  }, [enabled, refresh, interval]);

  const startAutoRefresh = useCallback(() => {
    scheduleNextRefresh();
  }, [scheduleNextRefresh]);

  const stopAutoRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setNextRefresh(null);
  }, []);

  return {
    isRefreshing,
    lastRefresh,
    nextRefresh,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export function useRefreshCounter(onRefresh: () => Promise<void>) {
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
      setRefreshCount((prev) => prev + 1);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [onRefresh]);

  const getTimeAgo = (): string => {
    if (!lastRefreshTime) return 'Never';

    const seconds = Math.floor((Date.now() - lastRefreshTime.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return {
    refreshCount,
    lastRefreshTime,
    timeAgo: getTimeAgo(),
    refresh: handleRefresh,
  };
}

export function useAnalyticsCache<T>(
  fetchFn: () => Promise<T>,
  cacheTime: number = 60 * 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{
    data: T | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  const isCacheValid = () => {
    return Date.now() - cacheRef.current.timestamp < cacheTime;
  };

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid() && cacheRef.current.data) {
      setData(cacheRef.current.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheTime]);

  const clear = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    fetch,
    clear,
    isCacheValid: isCacheValid(),
  };
}
