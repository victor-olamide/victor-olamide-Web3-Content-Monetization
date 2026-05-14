import { useMemo } from 'react';
import { ContentItem, CreatorContentType } from '@/utils/creatorApi';

export type SortField = 'date' | 'views' | 'revenue' | 'price';
export type SortOrder = 'asc' | 'desc';

export const CONTENT_TYPE_OPTIONS: Array<{ value: CreatorContentType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'video', label: 'Videos' },
  { value: 'article', label: 'Articles' },
  { value: 'image', label: 'Images' },
  { value: 'music', label: 'Music' },
];

const sortValue = (item: ContentItem, field: SortField) => {
  switch (field) {
    case 'date':
      return new Date(item.updatedAt || item.createdAt).getTime();
    case 'views':
      return item.views;
    case 'revenue':
      return item.revenue;
    case 'price':
      return item.price;
    default:
      return 0;
  }
};

export function useContentBrowser(
  items: ContentItem[],
  filterType: CreatorContentType | 'all',
  searchQuery: string,
  sortField: SortField,
  sortOrder: SortOrder
) {
  const hasFilters = filterType !== 'all' || searchQuery.trim().length > 0;

  const contentTypes = useMemo(() => CONTENT_TYPE_OPTIONS, []);

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.contentType === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, filterType, searchQuery]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aValue = sortValue(a, sortField);
      const bValue = sortValue(b, sortField);

      if (aValue === bValue) {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredItems, sortField, sortOrder]);

  return {
    contentTypes,
    filteredItems,
    sortedItems,
    hasFilters,
  };
}
