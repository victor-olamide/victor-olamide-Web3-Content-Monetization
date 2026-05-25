/**
 * usePagination Hook
 *
 * Provides pagination state and logic for large content lists.
 * Helps improve performance by limiting rendered items per page.
 */

import { useMemo, useState, useCallback } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

interface UsePaginationReturn<T> {
  paginatedItems: T[];
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}

const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook for managing pagination state and logic
 * 
 * @param items - Array of items to paginate
 * @param pageSize - Number of items per page (default: 10)
 * @returns Object containing paginated items and pagination controls
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const pagination = useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / currentPageSize) || 1;
    const validPage = Math.min(currentPage, totalPages);

    return {
      currentPage: validPage,
      pageSize: currentPageSize,
      totalItems,
      totalPages,
      startIndex: (validPage - 1) * currentPageSize,
      endIndex: Math.min(validPage * currentPageSize, totalItems),
    };
  }, [items.length, currentPageSize, currentPage]);

  const paginatedItems = useMemo(() => {
    return items.slice(pagination.startIndex, pagination.endIndex);
  }, [items, pagination.startIndex, pagination.endIndex]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, pagination.totalPages));
    setCurrentPage(validPage);
  }, [pagination.totalPages]);

  const nextPage = useCallback(() => {
    goToPage(pagination.currentPage + 1);
  }, [pagination.currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(pagination.currentPage - 1);
  }, [pagination.currentPage, goToPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setCurrentPageSize(Math.max(1, size));
    setCurrentPage(1);
  }, []);

  return {
    paginatedItems,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
  };
}
