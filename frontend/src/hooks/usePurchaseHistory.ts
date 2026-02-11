import { useState, useEffect, useCallback, useRef } from 'react';

export interface Purchase {
  _id: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  creatorAddress: string;
  purchasePrice: number;
  purchaseDate: string;
  transactionHash: string;
  transactionStatus: 'pending' | 'confirmed' | 'failed';
  downloads?: {
    total: number;
    lastDate?: string;
  };
  engagement?: {
    viewCount: number;
    watchTimeSeconds: number;
    completionPercentage: number;
    lastAccessedAt?: string;
  };
  rating?: {
    score?: number;
    review?: string;
    date?: string;
  };
  isFavorite?: boolean;
  refundInfo?: {
    refunded: boolean;
    date?: string;
    amount?: number;
    reason?: string;
  };
}

export interface PurchaseHistoryFilters {
  status?: 'pending' | 'confirmed' | 'failed' | 'all';
  contentType?: string;
  sortBy?: 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc';
}

interface UsePurchaseHistoryOptions {
  limit?: number;
  cacheTime?: number;
}

/**
 * Custom hook for managing purchase history
 * Provides purchase fetching, filtering, sorting, and pagination
 */
export const usePurchaseHistory = (options: UsePurchaseHistoryOptions = {}) => {
  const { limit = 10, cacheTime = 2 * 60 * 1000 } = options;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState<PurchaseHistoryFilters>({
    status: 'all',
    contentType: 'all',
    sortBy: 'date-desc'
  });

  const cacheRef = useRef<{
    data: Purchase[];
    timestamp: number;
    filters: PurchaseHistoryFilters;
    skip: number;
  }>({
    data: [],
    timestamp: 0,
    filters: {},
    skip: 0
  });

  /**
   * Fetch purchases from API
   */
  const fetchPurchases = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache
      const now = Date.now();
      const cacheValid =
        !forceRefresh &&
        cacheRef.current.data.length > 0 &&
        now - cacheRef.current.timestamp < cacheTime &&
        JSON.stringify(cacheRef.current.filters) === JSON.stringify(filters) &&
        cacheRef.current.skip === skip;

      if (cacheValid) {
        setPurchases(cacheRef.current.data);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        sortBy: filters.sortBy || 'date-desc'
      });

      const response = await fetch(`/api/profile/purchases?${params}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch purchases');

      const data = await response.json();
      let filteredPurchases = data.data;

      // Client-side filtering
      if (filters.status && filters.status !== 'all') {
        filteredPurchases = filteredPurchases.filter(
          (p: Purchase) => p.transactionStatus === filters.status
        );
      }

      if (filters.contentType && filters.contentType !== 'all') {
        filteredPurchases = filteredPurchases.filter(
          (p: Purchase) => p.contentType === filters.contentType
        );
      }

      // Update cache
      cacheRef.current = {
        data: filteredPurchases,
        timestamp: Date.now(),
        filters: filters,
        skip: skip
      };

      setPurchases(filteredPurchases);
      setTotal(data.total || filteredPurchases.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchases');
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, [skip, limit, filters, cacheTime]);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/profile/favorites/${purchaseId}`, {
        method: 'POST',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      // Update local state
      setPurchases((prev) =>
        prev.map((p) =>
          p._id === purchaseId ? { ...p, isFavorite: !p.isFavorite } : p
        )
      );

      // Update cache
      cacheRef.current.data = cacheRef.current.data.map((p) =>
        p._id === purchaseId ? { ...p, isFavorite: !p.isFavorite } : p
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      throw err;
    }
  }, []);

  /**
   * Add or update rating
   */
  const addRating = useCallback(
    async (purchaseId: string, score: number, review?: string) => {
      try {
        const response = await fetch(`/api/profile/rating/${purchaseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify({ rating: score, review })
        });

        if (!response.ok) throw new Error('Failed to add rating');

        const data = await response.json();

        // Update local state
        setPurchases((prev) =>
          prev.map((p) =>
            p._id === purchaseId ? { ...p, rating: data.data.rating } : p
          )
        );

        // Update cache
        cacheRef.current.data = cacheRef.current.data.map((p) =>
          p._id === purchaseId ? { ...p, rating: data.data.rating } : p
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add rating');
        throw err;
      }
    },
    []
  );

  /**
   * Record content access (view or download)
   */
  const recordAccess = useCallback(
    async (purchaseId: string, accessType: 'view' | 'download') => {
      try {
        const response = await fetch(`/api/profile/access/${purchaseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify({ accessType })
        });

        if (!response.ok) throw new Error(`Failed to record ${accessType}`);

        // Update local state engagement metrics
        setPurchases((prev) =>
          prev.map((p) => {
            if (p._id === purchaseId && p.engagement) {
              return {
                ...p,
                engagement: {
                  ...p.engagement,
                  viewCount:
                    accessType === 'view'
                      ? p.engagement.viewCount + 1
                      : p.engagement.viewCount,
                  lastAccessedAt: new Date().toISOString()
                }
              };
            }
            return p;
          })
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to record ${accessType}`);
        throw err;
      }
    },
    []
  );

  /**
   * Update completion percentage
   */
  const updateCompletion = useCallback(
    async (purchaseId: string, percentage: number) => {
      try {
        const response = await fetch(`/api/profile/completion/${purchaseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify({ percentage })
        });

        if (!response.ok) throw new Error('Failed to update completion');

        // Update local state
        setPurchases((prev) =>
          prev.map((p) => {
            if (p._id === purchaseId && p.engagement) {
              return {
                ...p,
                engagement: {
                  ...p.engagement,
                  completionPercentage: percentage
                }
              };
            }
            return p;
          })
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update completion');
        throw err;
      }
    },
    []
  );

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters: Partial<PurchaseHistoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    setSkip(0);
  }, []);

  /**
   * Change page
   */
  const goToPage = useCallback((page: number) => {
    const newSkip = (page - 1) * limit;
    setSkip(newSkip);
    setCurrentPage(page);
  }, [limit]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current = {
      data: [],
      timestamp: 0,
      filters: {},
      skip: 0
    };
  }, []);

  /**
   * Fetch purchases on mount and when filters/pagination change
   */
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return {
    purchases,
    isLoading,
    error,
    total,
    currentPage,
    limit,
    filters,
    fetchPurchases,
    toggleFavorite,
    addRating,
    recordAccess,
    updateCompletion,
    updateFilters,
    goToPage,
    clearCache
  };
};

export default usePurchaseHistory;
