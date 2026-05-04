import { useState, useEffect, useCallback } from 'react';

interface PreviewData {
  contentId: number;
  title: string;
  description: string;
  contentType: string;
  price: number;
  creator: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  totalViews?: number;
}

interface UsePreviewDiscoveryOptions {
  contentType?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'trending' | 'newest' | 'price' | 'views';
}

/**
 * Hook for discovering and browsing content previews
 */
export const usePreviewDiscovery = (options: UsePreviewDiscoveryOptions = {}) => {
  const {
    contentType,
    limit = 12,
    skip = 0,
    sortBy = 'trending'
  } = options;

  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPreviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = '/api/preview';
      const params = new URLSearchParams();

      if (contentType) {
        url += `/type/${contentType}`;
      } else if (sortBy === 'trending') {
        url += '/trending';
      }

      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      if (url.includes('?')) {
        url += '&' + params.toString();
      } else {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch previews');
      }

      const data = await response.json();
      
      if (data.data.data) {
        // Batch endpoint response
        setPreviews(data.data.data);
        setTotal(data.data.total);
      } else if (Array.isArray(data.data)) {
        // Array response
        setPreviews(data.data);
      } else {
        setPreviews([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch previews');
      setPreviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentType, limit, skip, sortBy]);

  useEffect(() => {
    fetchPreviews();
  }, [fetchPreviews]);

  const loadMore = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const sortPreviews = (field: 'price' | 'views' | 'title'): PreviewData[] => {
    const sorted = [...previews];
    sorted.sort((a, b) => {
      switch (field) {
        case 'price':
          return a.price - b.price;
        case 'views':
          return (b.totalViews || 0) - (a.totalViews || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    return sorted;
  };

  const filterPreviews = (predicate: (preview: PreviewData) => boolean): PreviewData[] => {
    return previews.filter(predicate);
  };

  const searchPreviews = (query: string): PreviewData[] => {
    const lowerQuery = query.toLowerCase();
    return previews.filter(
      (preview) =>
        preview.title.toLowerCase().includes(lowerQuery) ||
        preview.description.toLowerCase().includes(lowerQuery) ||
        preview.creator.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    previews,
    isLoading,
    error,
    total,
    currentPage,
    loadMore,
    refresh: fetchPreviews,
    sortPreviews,
    filterPreviews,
    searchPreviews
  };
};

export default usePreviewDiscovery;
