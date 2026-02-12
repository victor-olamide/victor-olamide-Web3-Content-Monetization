import { useState, useCallback, useEffect } from 'react';
import { filterApi } from '../utils/filterApi';

export interface FilterState {
  categories: string[];
  minPrice: number | null;
  maxPrice: number | null;
  searchTerm: string;
  sortBy: 'createdAt' | 'price' | 'totalViews' | 'title';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface FilterResult {
  results: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: FilterState;
}

/**
 * useFilters Hook
 * Manages content filtering state and operations
 */
export function useFilters(initialFilters?: Partial<FilterState>) {
  // State management
  const [filters, setFilters] = useState<FilterState>({
    categories: initialFilters?.categories || [],
    minPrice: initialFilters?.minPrice || null,
    maxPrice: initialFilters?.maxPrice || null,
    searchTerm: initialFilters?.searchTerm || '',
    sortBy: initialFilters?.sortBy || 'createdAt',
    sortOrder: initialFilters?.sortOrder || 'desc',
    page: initialFilters?.page || 1,
    limit: initialFilters?.limit || 20
  });

  const [results, setResults] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch filtered content
  const applyFilters = useCallback(
    async (filterOverrides?: Partial<FilterState>) => {
      try {
        setIsLoading(true);
        setError(null);

        const finalFilters = { ...filters, ...filterOverrides };
        setFilters(finalFilters);

        const result: FilterResult = await filterApi.searchContent({
          categories: finalFilters.categories,
          minPrice: finalFilters.minPrice,
          maxPrice: finalFilters.maxPrice,
          searchTerm: finalFilters.searchTerm,
          sortBy: finalFilters.sortBy,
          sortOrder: finalFilters.sortOrder,
          page: finalFilters.page,
          limit: finalFilters.limit
        });

        setResults(result.results);
        setPagination(result.pagination);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to apply filters';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Update individual filter
  const updateFilter = useCallback(
    (filterName: keyof FilterState, value: any) => {
      const newFilters = {
        ...filters,
        [filterName]: value,
        page: 1 // Reset to first page on filter change
      };
      applyFilters(newFilters);
    },
    [filters, applyFilters]
  );

  // Update categories
  const setCategories = useCallback(
    (categories: string[]) => {
      updateFilter('categories', categories);
    },
    [updateFilter]
  );

  // Update price range
  const setPriceRange = useCallback(
    (minPrice: number | null, maxPrice: number | null) => {
      const newFilters = {
        ...filters,
        minPrice,
        maxPrice,
        page: 1
      };
      applyFilters(newFilters);
    },
    [filters, applyFilters]
  );

  // Update search term
  const setSearchTerm = useCallback(
    (searchTerm: string) => {
      updateFilter('searchTerm', searchTerm);
    },
    [updateFilter]
  );

  // Update sorting
  const setSortBy = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
      updateFilter('sortBy', sortBy);
      const newFilters = {
        ...filters,
        sortBy: sortBy as any,
        sortOrder,
        page: 1
      };
      applyFilters(newFilters);
    },
    [filters, applyFilters]
  );

  // Pagination functions
  const goToPage = useCallback(
    (page: number) => {
      updateFilter('page', page);
    },
    [updateFilter]
  );

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(filters.page + 1);
    }
  }, [pagination, filters.page, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      goToPage(filters.page - 1);
    }
  }, [pagination, filters.page, goToPage]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const resetFilters: FilterState = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      searchTerm: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    };
    applyFilters(resetFilters);
  }, [applyFilters]);

  // Change results per page
  const setLimit = useCallback(
    (limit: number) => {
      const newFilters = {
        ...filters,
        limit,
        page: 1
      };
      applyFilters(newFilters);
    },
    [filters, applyFilters]
  );

  // Initial load
  useEffect(() => {
    applyFilters();
  }, []);

  return {
    // State
    filters,
    results,
    pagination,
    isLoading,
    error,

    // Filter operations
    applyFilters,
    setCategories,
    setPriceRange,
    setSearchTerm,
    setSortBy,
    updateFilter,

    // Pagination
    goToPage,
    nextPage,
    prevPage,
    setLimit,

    // Utilities
    clearAllFilters,
    hasActiveFilters: () =>
      filters.categories.length > 0 ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.searchTerm.trim() !== '',
    totalResults: pagination.total,
    currentResults: results.length,
    isFirstPage: filters.page === 1,
    isLastPage: !pagination.hasNextPage
  };
}
