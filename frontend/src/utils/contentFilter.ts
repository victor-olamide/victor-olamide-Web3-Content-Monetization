/**
 * Content Filtering Utilities
 *
 * Helper functions for advanced filtering and searching of content items
 */

import { ContentItem, CreatorContentType } from '@/utils/creatorApi';

export interface FilterCriteria {
  contentType?: CreatorContentType | 'all';
  minPrice?: number;
  maxPrice?: number;
  minViews?: number;
  minRevenue?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Filter content items by multiple criteria
 */
export function filterContent(
  items: ContentItem[],
  criteria: FilterCriteria
): ContentItem[] {
  return items.filter((item) => {
    // Filter by type
    if (criteria.contentType && criteria.contentType !== 'all') {
      if (item.contentType !== criteria.contentType) {
        return false;
      }
    }

    // Filter by price range
    if (criteria.minPrice !== undefined && item.price < criteria.minPrice) {
      return false;
    }
    if (criteria.maxPrice !== undefined && item.price > criteria.maxPrice) {
      return false;
    }

    // Filter by minimum views
    if (criteria.minViews !== undefined && item.views < criteria.minViews) {
      return false;
    }

    // Filter by minimum revenue
    if (criteria.minRevenue !== undefined && item.revenue < criteria.minRevenue) {
      return false;
    }

    // Filter by date range
    if (criteria.dateRange) {
      const itemDate = new Date(item.updatedAt || item.createdAt);
      if (itemDate < criteria.dateRange.from || itemDate > criteria.dateRange.to) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Search content items by text
 */
export function searchContent(items: ContentItem[], query: string): ContentItem[] {
  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get content statistics for a filtered set
 */
export function getContentStats(items: ContentItem[]) {
  if (items.length === 0) {
    return {
      count: 0,
      totalViews: 0,
      totalRevenue: 0,
      totalPurchases: 0,
      averagePrice: 0,
      averageViews: 0,
      averageRevenue: 0,
      bestPerformer: null as ContentItem | null,
      worstPerformer: null as ContentItem | null,
    };
  }

  const totalViews = items.reduce((sum, item) => sum + item.views, 0);
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const totalPurchases = items.reduce((sum, item) => sum + item.purchases, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  const bestPerformer = items.reduce((best, item) =>
    item.revenue > (best?.revenue || 0) ? item : best
  );

  const worstPerformer = items.reduce((worst, item) =>
    item.revenue < (worst?.revenue || Infinity) ? item : worst
  );

  return {
    count: items.length,
    totalViews,
    totalRevenue,
    totalPurchases,
    averagePrice: totalPrice / items.length,
    averageViews: totalViews / items.length,
    averageRevenue: totalRevenue / items.length,
    bestPerformer: bestPerformer || null,
    worstPerformer: worstPerformer || null,
  };
}

/**
 * Group content items by type
 */
export function groupByContentType(items: ContentItem[]) {
  const grouped: Record<CreatorContentType, ContentItem[]> = {
    video: [],
    article: [],
    image: [],
    music: [],
  };

  items.forEach((item) => {
    grouped[item.contentType].push(item);
  });

  return grouped;
}

/**
 * Sort content items by revenue in descending order
 */
export function sortByRevenue(items: ContentItem[], order: 'asc' | 'desc' = 'desc') {
  return [...items].sort((a, b) => {
    if (order === 'desc') {
      return b.revenue - a.revenue;
    }
    return a.revenue - b.revenue;
  });
}

/**
 * Sort content items by views in descending order
 */
export function sortByViews(items: ContentItem[], order: 'asc' | 'desc' = 'desc') {
  return [...items].sort((a, b) => {
    if (order === 'desc') {
      return b.views - a.views;
    }
    return a.views - b.views;
  });
}
