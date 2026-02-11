import { useState, useCallback, useEffect } from 'react';

export interface Transaction {
  _id: string;
  userAddress: string;
  transactionType: string;
  amount: number;
  amountUsd: number;
  txHash: string;
  status: string;
  description: string;
  category: string;
  createdAt: string;
  blockHeight: number;
  confirmations: number;
}

export interface TransactionHistoryOptions {
  skip?: number;
  limit?: number;
  status?: string;
  type?: string;
  category?: string;
  sortBy?: 'date-asc' | 'date-desc' | 'amount-asc' | 'amount-desc';
  startDate?: string;
  endDate?: string;
}

export interface TransactionHistoryResult {
  transactions: Transaction[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  setFilters: (options: Partial<TransactionHistoryOptions>) => void;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  resetFilters: () => void;
}

const DEFAULT_LIMIT = 20;

const defaultOptions: TransactionHistoryOptions = {
  skip: 0,
  limit: DEFAULT_LIMIT,
  sortBy: 'date-desc'
};

/**
 * useTransactionHistory Hook
 * Manages transaction history fetching, pagination, and filtering
 * 
 * Usage:
 * const { transactions, isLoading, error, nextPage } = useTransactionHistory({
 *   limit: 20,
 *   status: 'confirmed'
 * });
 */
export const useTransactionHistory = (
  initialOptions?: Partial<TransactionHistoryOptions>
): TransactionHistoryResult => {
  const [options, setOptions] = useState<TransactionHistoryOptions>({
    ...defaultOptions,
    ...initialOptions
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query string from current options
  const buildQueryString = useCallback((): string => {
    const params = new URLSearchParams();

    if (options.skip !== undefined) params.append('skip', options.skip.toString());
    if (options.limit !== undefined) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    if (options.type) params.append('type', options.type);
    if (options.category) params.append('category', options.category);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    return params.toString();
  }, [options]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryString = buildQueryString();
      const url = `/api/transactions/history?${queryString}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      const data = await response.json();

      setTransactions(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  // Fetch on mount and when options change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Update filters
  const setFilters = useCallback((newOptions: Partial<TransactionHistoryOptions>) => {
    setOptions((prev) => ({
      ...prev,
      ...newOptions,
      skip: 0 // Reset to first page when filters change
    }));
  }, []);

  // Navigate to next page
  const nextPage = useCallback(async () => {
    const nextSkip = (options.skip || 0) + (options.limit || DEFAULT_LIMIT);
    if (nextSkip < total) {
      setOptions((prev) => ({
        ...prev,
        skip: nextSkip
      }));
    }
  }, [options.skip, options.limit, total]);

  // Navigate to previous page
  const previousPage = useCallback(async () => {
    const prevSkip = Math.max(0, (options.skip || 0) - (options.limit || DEFAULT_LIMIT));
    setOptions((prev) => ({
      ...prev,
      skip: prevSkip
    }));
  }, [options.skip, options.limit]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setOptions(defaultOptions);
  }, []);

  // Calculate if there are more results
  const hasMore = ((options.skip || 0) + (options.limit || DEFAULT_LIMIT)) < total;

  return {
    transactions,
    total,
    isLoading,
    error,
    hasMore,
    refetch: fetchTransactions,
    setFilters,
    nextPage,
    previousPage,
    resetFilters
  };
};

export default useTransactionHistory;
