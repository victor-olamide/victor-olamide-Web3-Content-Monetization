import { useState, useEffect, useCallback } from 'react';
import { creatorApi, ContentItem, CreatorStats, SubscriberInfo } from '@/utils/creatorApi';

interface UseCreatorContentReturn {
  content: ContentItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deleteContent: (contentId: number) => Promise<boolean>;
  updateContent: (contentId: number, data: Partial<ContentItem>) => Promise<boolean>;
}

/**
 * Hook to manage creator content
 */
export function useCreatorContent(creatorAddress?: string): UseCreatorContentReturn {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await creatorApi.getCreatorContent(creatorAddress);
      setContent(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch content';
      setError(errorMessage);
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDeleteContent = useCallback(
    async (contentId: number): Promise<boolean> => {
      if (!creatorAddress) {
        setError('Creator address is required');
        return false;
      }

      try {
        await creatorApi.deleteContent(contentId, creatorAddress);
        setContent(prev => prev.filter(item => item.contentId !== contentId));
        return true;
      } catch (err) {
        console.error('Failed to delete content:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete content');
        return false;
      }
    },
    [creatorAddress]
  );

  const handleUpdateContent = useCallback(
    async (contentId: number, data: Partial<ContentItem>): Promise<boolean> => {
      if (!creatorAddress) {
        setError('Creator address is required');
        return false;
      }

      try {
        const updated = await creatorApi.updateContent(contentId, creatorAddress, {
          ...data,
          creator: creatorAddress,
        });
        setContent(prev =>
          prev.map(item => (item.contentId === contentId ? updated : item))
        );
        return true;
      } catch (err) {
        console.error('Failed to update content:', err);
        setError(err instanceof Error ? err.message : 'Failed to update content');
        return false;
      }
    },
    [creatorAddress]
  );

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    deleteContent: handleDeleteContent,
    updateContent: handleUpdateContent
  };
}

interface UseCreatorStatsReturn {
  stats: CreatorStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch creator earnings and stats
 */
export function useCreatorStats(creatorAddress: string): UseCreatorStatsReturn {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!creatorAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await creatorApi.getEarnings(creatorAddress);
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(errorMessage);
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

interface UseCreatorSubscribersReturn {
  subscribers: SubscriberInfo[];
  subscriberCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch creator subscribers
 */
export function useCreatorSubscribers(creatorAddress: string): UseCreatorSubscribersReturn {
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    if (!creatorAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await creatorApi.getSubscribers(creatorAddress);
      setSubscribers(data.subscribers);
      setCount(data.count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscribers';
      setError(errorMessage);
      console.error('Error fetching subscribers:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  return {
    subscribers,
    subscriberCount: count,
    loading,
    error,
    refetch: fetchSubscribers
  };
}
