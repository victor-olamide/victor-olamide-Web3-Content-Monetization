'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ContentItem,
  CreatorContentFormValues,
  CreatorDashboardMetrics,
  creatorApi,
} from '@/utils/creatorApi';

interface UseCreatorDashboardReturn {
  content: ContentItem[];
  metrics: CreatorDashboardMetrics | null;
  loading: boolean;
  saving: boolean;
  deletingId: number | null;
  error: string | null;
  refresh: () => Promise<void>;
  saveContent: (values: CreatorContentFormValues, contentToEdit?: ContentItem | null) => Promise<boolean>;
  removeContent: (contentId: number) => Promise<boolean>;
  totals: {
    totalViews: number;
    totalPurchases: number;
    conversionRate: number;
    averagePrice: number;
  };
}

export function useCreatorDashboard(creatorAddress?: string | null): UseCreatorDashboardReturn {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [metrics, setMetrics] = useState<CreatorDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!creatorAddress) {
      setLoading(false);
      setContent([]);
      setMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [contentItems, dashboardMetrics] = await Promise.all([
        creatorApi.getCreatorContent(creatorAddress),
        creatorApi.getDashboardMetrics(creatorAddress),
      ]);

      setContent(
        [...contentItems].sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )
      );
      setMetrics(dashboardMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creator dashboard');
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveContent = useCallback(
    async (values: CreatorContentFormValues, contentToEdit?: ContentItem | null) => {
      if (!creatorAddress) {
        setError('Connect your creator wallet to manage content.');
        return false;
      }

      setSaving(true);
      setError(null);

      try {
        const savedContent = await creatorApi.saveContent(creatorAddress, content, values, contentToEdit);

        setContent((currentContent) => {
          if (contentToEdit) {
            return currentContent
              .map((item) => (item.contentId === contentToEdit.contentId ? savedContent : item))
              .sort(
                (a, b) =>
                  new Date(b.updatedAt || b.createdAt).getTime() -
                  new Date(a.updatedAt || a.createdAt).getTime()
              );
          }

          return [savedContent, ...currentContent].sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
          );
        });

        const dashboardMetrics = await creatorApi.getDashboardMetrics(creatorAddress);
        setMetrics(dashboardMetrics);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save content');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [content, creatorAddress]
  );

  const removeContent = useCallback(
    async (contentId: number) => {
      if (!creatorAddress) {
        setError('Connect your creator wallet to manage content.');
        return false;
      }

      setDeletingId(contentId);
      setError(null);

      try {
        await creatorApi.deleteContent(contentId, creatorAddress);
        setContent((currentContent) => currentContent.filter((item) => item.contentId !== contentId));
        const dashboardMetrics = await creatorApi.getDashboardMetrics(creatorAddress);
        setMetrics(dashboardMetrics);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete content');
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [creatorAddress]
  );

  const totals = useMemo(() => {
    const totalViews = content.reduce((sum, item) => sum + item.views, 0);
    const totalPurchases = content.reduce((sum, item) => sum + item.purchases, 0);
    const averagePrice =
      content.length > 0 ? content.reduce((sum, item) => sum + item.price, 0) / content.length : 0;

    return {
      totalViews,
      totalPurchases,
      conversionRate: totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0,
      averagePrice,
    };
  }, [content]);

  return {
    content,
    metrics,
    loading,
    saving,
    deletingId,
    error,
    refresh,
    saveContent,
    removeContent,
    totals,
  };
}
