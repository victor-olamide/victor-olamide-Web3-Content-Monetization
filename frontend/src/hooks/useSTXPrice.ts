import { useState, useCallback, useEffect } from 'react';

export interface PriceData {
  current: number;
  volume_24h: number;
  change_24h: number;
  change_24h_percent: string;
  last_updated: string;
  cache_age_ms: number;
}

export interface PriceResult {
  current: number | null;
  formatted: string;
  change_24h: number | null;
  change_24h_percent: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useSTXPrice Hook
 * Fetches and caches current STX/USD price data
 * Auto-refreshes at configurable intervals
 * 
 * Usage:
 * const { current, formatted, change_24h } = useSTXPrice(30000); // Refresh every 30s
 */
export const useSTXPrice = (refreshInterval: number = 0): PriceResult => {
  const [current, setCurrent] = useState<number | null>(null);
  const [formatted, setFormatted] = useState<string>('Loading...');
  const [change_24h, setChange24h] = useState<number | null>(null);
  const [change_24h_percent, setChange24hPercent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch price data
  const fetchPrice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/prices/stx');

      if (!response.ok) {
        throw new Error('Failed to fetch STX price');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const priceData = data.data;
        setCurrent(priceData.current);
        setFormatted(`$${priceData.current.toFixed(2)}`);
        setChange24h(priceData.change_24h);
        setChange24hPercent(priceData.change_24h_percent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchPrice();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchPrice]);

  return {
    current,
    formatted,
    change_24h,
    change_24h_percent,
    isLoading,
    error,
    refetch: fetchPrice
  };
};

export default useSTXPrice;
