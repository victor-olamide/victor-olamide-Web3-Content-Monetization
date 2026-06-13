"use client";

import { useState, useEffect, useCallback } from 'react';
import { ContentItem } from './useContentSearch';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL
  ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')
  : '';

const getApiUrl = (path: string) => (BACKEND_BASE ? `${BACKEND_BASE}${path}` : path);

const buildQueryString = (params: {
  q?: string;
  categories?: string[];
  page?: number;
  limit?: number;
}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.categories?.length) {
    params.categories.forEach((category) => search.append('category', category));
  }
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  return search.toString();
};

export type ExploreContentItem = ContentItem & {
  thumbnailUrl?: string;
  totalViews?: number;
};

export const useExploreContent = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<ExploreContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExploreContent = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString({
          q: query,
          categories: selectedCategories,
          page,
          limit: 20
        });

        const response = await fetch(getApiUrl(`/api/content?${queryString}`), { signal });
        if (!response.ok) {
          throw new Error('Failed to fetch explore content');
        }

        const data = await response.json();
        const contentResults = Array.isArray(data.results) ? data.results : [];
        setTotal(data.total || 0);
        setPages(data.pages || 0);

        const contentIds = contentResults
          .map((item: any) => item.contentId)
          .filter((id: unknown) => typeof id === 'number');

        const previewMap = new Map<number, any>();
        if (contentIds.length > 0) {
          try {
            const previewResponse = await fetch(getApiUrl('/api/preview/batch/get'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contentIds })
            });

            if (previewResponse.ok) {
              const previewData = await previewResponse.json();
              if (Array.isArray(previewData.data)) {
                previewData.data.forEach((preview: any) => {
                  if (typeof preview.contentId === 'number') {
                    previewMap.set(preview.contentId, preview);
                  }
                });
              }
            }
          } catch (previewError) {
            // Ignore preview enrichment failures and continue with base results.
          }
        }

        setResults(
          contentResults.map((item: any) => {
            const preview = previewMap.get(item.contentId);
            return {
              ...item,
              thumbnailUrl: item.thumbnailUrl || preview?.thumbnailUrl,
              totalViews: item.totalViews ?? preview?.totalViews
            } as ExploreContentItem;
          })
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
      } finally {
        setLoading(false);
      }
    },
    [query, selectedCategories, page]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchExploreContent(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchExploreContent]);

  return {
    query,
    setQuery,
    selectedCategories,
    setSelectedCategories,
    results,
    loading,
    page,
    setPage,
    total,
    pages,
    error
  };
};
