"use client";

import { useState, useEffect } from 'react';

export type ContentItem = {
  _id?: string;
  contentId?: number;
  title?: string;
  description?: string;
  price?: number;
  creator?: string;
  contentType?: string;
};

export const useContentSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/search`);
        url.searchParams.set('q', query);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', '20');

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch search results');
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // debounce simple
    const timer = setTimeout(() => {
      if (query.length === 0 || query.length >= 1) fetchResults();
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page]);

  return {
    query,
    setQuery,
    results,
    loading,
    page,
    setPage,
    total,
    error
  };
};

export default useContentSearch;
import { useState, useEffect, useCallback } from 'react';

export interface SearchFilters {
  q?: string;
  contentType?: string;
  creator?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const useContentSearch = (initialFilters: SearchFilters = {}) => {
  const [filters, setFilters] = useState<SearchFilters>({ ...initialFilters });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = (obj: any) => {
    const params = new URLSearchParams();
    Object.keys(obj).forEach((k) => {
      const v = (obj as any)[k];
      if (typeof v !== 'undefined' && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    return params.toString();
  };

  const fetchResults = useCallback(async (currentFilters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString(currentFilters);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/search?${qs}`);
      const data = await res.json();
      setResults(data.results || []);
      setPageInfo({ page: data.page || 1, limit: data.limit || 20, total: data.total || 0, pages: data.pages || 0 });
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(filters);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, fetchResults]);

  const setFilter = (patch: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filters,
    setFilter,
    clearFilters,
    results,
    loading,
    error,
    pageInfo,
    fetchResults
  };
};

export default useContentSearch;
