/**
 * Tests for usePagination hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

const sampleItems = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
}));

describe('usePagination', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => usePagination(sampleItems));

    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pagination.pageSize).toBe(10);
    expect(result.current.pagination.totalPages).toBe(3);
    expect(result.current.pagination.totalItems).toBe(25);
  });

  it('returns correct paginated items for first page', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.paginatedItems[0].id).toBe(1);
    expect(result.current.paginatedItems[9].id).toBe(10);
  });

  it('navigates to next page correctly', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.pagination.currentPage).toBe(2);
    expect(result.current.paginatedItems[0].id).toBe(11);
    expect(result.current.paginatedItems[9].id).toBe(20);
  });

  it('navigates to previous page correctly', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.nextPage();
      result.current.nextPage();
    });

    expect(result.current.pagination.currentPage).toBe(3);

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.pagination.currentPage).toBe(2);
  });

  it('goes to specific page', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.pagination.currentPage).toBe(3);
    expect(result.current.paginatedItems[0].id).toBe(21);
    expect(result.current.paginatedItems[4].id).toBe(25);
  });

  it('prevents navigation beyond last page', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.nextPage();
      result.current.nextPage();
      result.current.nextPage();
    });

    expect(result.current.pagination.currentPage).toBe(3);
  });

  it('prevents navigation before first page', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.pagination.currentPage).toBe(1);
  });

  it('changes page size and resets to page 1', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.pagination.currentPage).toBe(2);

    act(() => {
      result.current.setPageSize(5);
    });

    expect(result.current.pagination.pageSize).toBe(5);
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pagination.totalPages).toBe(5);
    expect(result.current.paginatedItems).toHaveLength(5);
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.pagination.totalItems).toBe(0);
    expect(result.current.pagination.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it('handles last page with fewer items than page size', () => {
    const { result } = renderHook(() => usePagination(sampleItems, 10));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.pagination.startIndex).toBe(20);
    expect(result.current.pagination.endIndex).toBe(25);
  });

  it('recalculates pagination when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: typeof sampleItems }) => usePagination(items, 10),
      { initialProps: { items: sampleItems } }
    );

    expect(result.current.pagination.totalPages).toBe(3);

    const newItems = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      title: `Item ${i + 1}`,
    }));

    rerender({ items: newItems });

    expect(result.current.pagination.totalPages).toBe(5);
    expect(result.current.pagination.totalItems).toBe(50);
  });

  it('memoizes paginatedItems correctly', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: typeof sampleItems }) => usePagination(items, 10),
      { initialProps: { items: sampleItems } }
    );

    const firstResult = result.current.paginatedItems;

    rerender({ items: sampleItems });

    expect(result.current.paginatedItems).toBe(firstResult);
  });
});
