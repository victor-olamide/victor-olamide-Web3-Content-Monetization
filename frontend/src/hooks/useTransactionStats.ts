import { useState, useCallback, useEffect } from 'react';

export interface TransactionStats {
  totalTransactions: number;
  confirmedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  totalUsd: number;
  averageAmount: number;
  lastTransactionDate: string | null;
}

export interface TransactionSummary {
  totalAmount: number;
  totalUsd: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface TransactionStatsResult {
  stats: TransactionStats | null;
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useTransactionStats Hook
 * Fetches and caches transaction statistics and summaries
 * Auto-refreshes at configurable intervals
 * 
 * Usage:
 * const { stats, summary, isLoading } = useTransactionStats();
 */
export const useTransactionStats = (
  refreshInterval: number = 0 // 0 = no auto-refresh
): TransactionStatsResult => {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats and summary — accepts optional AbortSignal for cleanup.
  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const sessionId = localStorage.getItem('sessionId') || '';

      // Fetch stats
      const statsResponse = await fetch('/api/transactions/stats', {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch transaction stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData.data || null);

      // Fetch summary
      const summaryResponse = await fetch('/api/transactions/summary', {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        }
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.data || null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      setStats(null);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — cancel on unmount.
  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchStats]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchStats]);

  return {
    stats,
    summary,
    isLoading,
    error,
    refetch: fetchStats
  };
};

export default useTransactionStats;
