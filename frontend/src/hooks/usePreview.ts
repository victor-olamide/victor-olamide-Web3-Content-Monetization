import { useState, useEffect, useCallback } from 'react';

export interface PreviewData {
  contentId: number;
  title: string;
  description: string;
  contentType: string;
  price: number;
  creator: string;
  thumbnailUrl?: string;
  thumbnailQuality?: string;
  trailerUrl?: string;
  trailerDuration?: number;
  trailerQuality?: string;
  previewText?: string;
  previewImageUrl?: string;
  contentAccessType?: string;
  totalViews?: number;
}

export interface AccessStatus {
  contentId: number;
  hasAccess: boolean;
  accessType: 'purchased' | 'subscription' | 'preview_only';
  purchaseDate?: string;
  subscriptionDate?: string;
  requiresTokenGating?: boolean;
  requiredToken?: string;
  minBalance?: number;
}

export interface PreviewStats {
  totalPreviews: number;
  totalPreviewViews: number;
  totalPreviewDownloads: number;
  contentWithPreviews: Array<{
    contentId: number;
    title: string;
    views: number;
    downloads: number;
  }>;
  previewBreakdown: {
    withThumbnails: number;
    withTrailers: number;
    withPreviewText: number;
  };
}

/**
 * Hook for fetching content preview data
 */
export const useContentPreview = (contentId: number) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/preview/${contentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch preview');
      }
      const data = await response.json();
      setPreview(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  return { preview, loading, error, refetch: fetchPreview };
};

/**
 * Hook for checking user access status to content
 */
export const useContentAccess = (contentId: number, userAddress?: string) => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/preview/${contentId}/access/${userAddress}`);
      if (!response.ok) {
        throw new Error('Failed to check access');
      }
      const data = await response.json();
      setAccessStatus(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setAccessStatus(null);
    } finally {
      setLoading(false);
    }
  }, [contentId, userAddress]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { accessStatus, loading, error, refetch: checkAccess };
};

/**
 * Hook for fetching trending previews
 */
export const useTrendingPreviews = (limit = 10, days = 7) => {
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/preview/trending?limit=${limit}&days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trending previews');
      }
      const data = await response.json();
      setPreviews(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending');
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  }, [limit, days]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return { previews, loading, error, refetch: fetchTrending };
};

/**
 * Hook for fetching previews by content type
 */
export const usePreviewsByType = (contentType: string, limit = 10, skip = 0) => {
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchByType = useCallback(async () => {
    if (!contentType || contentType === 'all') {
      setPreviews([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/preview/type/${contentType}?limit=${limit}&skip=${skip}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch previews by type');
      }
      const data = await response.json();
      setPreviews(data.data?.data || data.data || []);
      setTotal(data.data?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load previews');
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  }, [contentType, limit, skip]);

  useEffect(() => {
    fetchByType();
  }, [fetchByType]);

  return { previews, total, loading, error, refetch: fetchByType };
};

/**
 * Hook for fetching batch previews
 */
export const useBatchPreviews = (contentIds: number[]) => {
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!contentIds || contentIds.length === 0) {
      setPreviews([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/preview/batch/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch batch previews');
      }
      const data = await response.json();
      setPreviews(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load previews');
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  }, [contentIds]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return { previews, loading, error, refetch: fetchBatch };
};

/**
 * Hook for creator preview statistics
 */
export const usePreviewStats = (creatorAddress: string) => {
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!creatorAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/preview/stats/${creatorAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch preview stats');
      }
      const data = await response.json();
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

/**
 * Hook for recording preview downloads
 */
export const useRecordPreviewDownload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordDownload = useCallback(async (contentId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/preview/${contentId}/download`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to record download');
      }
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record download');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { recordDownload, loading, error };
};

export default {
  useContentPreview,
  useContentAccess,
  useTrendingPreviews,
  usePreviewsByType,
  useBatchPreviews,
  usePreviewStats,
  useRecordPreviewDownload
};
