/**
 * Tests for content filtering utilities
 */

import {
  filterContent,
  searchContent,
  getContentStats,
  groupByContentType,
  sortByRevenue,
  sortByViews,
} from './contentFilter';
import { ContentItem } from './creatorApi';

const sampleItems: ContentItem[] = [
  {
    contentId: 1,
    title: 'React Tutorial',
    description: 'Learn React hooks and state management',
    contentType: 'video',
    price: 10,
    views: 500,
    revenue: 250,
    purchases: 25,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    creator: 'creator1',
  },
  {
    contentId: 2,
    title: 'TypeScript Guide',
    description: 'Complete TypeScript best practices',
    contentType: 'article',
    price: 5,
    views: 300,
    revenue: 75,
    purchases: 15,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-14T00:00:00Z',
    creator: 'creator1',
  },
  {
    contentId: 3,
    title: 'Design System',
    description: 'UI components and design guidelines',
    contentType: 'image',
    price: 20,
    views: 100,
    revenue: 80,
    purchases: 4,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-13T00:00:00Z',
    creator: 'creator1',
  },
  {
    contentId: 4,
    title: 'Ambient Music',
    description: 'Focus and study background music',
    contentType: 'music',
    price: 3,
    views: 800,
    revenue: 160,
    purchases: 50,
    createdAt: '2026-01-04T00:00:00Z',
    updatedAt: '2026-01-12T00:00:00Z',
    creator: 'creator1',
  },
];

describe('contentFilter utilities', () => {
  describe('filterContent', () => {
    it('filters by content type', () => {
      const result = filterContent(sampleItems, { contentType: 'video' });
      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe(1);
    });

    it('filters by price range', () => {
      const result = filterContent(sampleItems, { minPrice: 5, maxPrice: 10 });
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.contentId)).toEqual([1, 2]);
    });

    it('filters by minimum views', () => {
      const result = filterContent(sampleItems, { minViews: 300 });
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.contentId)).toEqual([1, 4]);
    });

    it('filters by minimum revenue', () => {
      const result = filterContent(sampleItems, { minRevenue: 100 });
      expect(result).toHaveLength(3);
    });

    it('combines multiple filter criteria', () => {
      const result = filterContent(sampleItems, {
        contentType: 'video',
        minPrice: 5,
        minViews: 100,
      });
      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe(1);
    });
  });

  describe('searchContent', () => {
    it('searches by title', () => {
      const result = searchContent(sampleItems, 'tutorial');
      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe(1);
    });

    it('searches by description', () => {
      const result = searchContent(sampleItems, 'typescript');
      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe(2);
    });

    it('is case-insensitive', () => {
      const result = searchContent(sampleItems, 'REACT');
      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe(1);
    });

    it('returns all items for empty query', () => {
      const result = searchContent(sampleItems, '');
      expect(result).toHaveLength(4);
    });
  });

  describe('getContentStats', () => {
    it('calculates correct statistics', () => {
      const stats = getContentStats(sampleItems);

      expect(stats.count).toBe(4);
      expect(stats.totalViews).toBe(1700);
      expect(stats.totalRevenue).toBe(565);
      expect(stats.totalPurchases).toBe(94);
      expect(stats.averagePrice).toBe(9.5);
    });

    it('identifies best and worst performers', () => {
      const stats = getContentStats(sampleItems);

      expect(stats.bestPerformer?.contentId).toBe(1); // React Tutorial: 250 revenue
      expect(stats.worstPerformer?.contentId).toBe(2); // TypeScript Guide: 75 revenue
    });

    it('handles empty items array', () => {
      const stats = getContentStats([]);

      expect(stats.count).toBe(0);
      expect(stats.bestPerformer).toBeNull();
      expect(stats.worstPerformer).toBeNull();
    });
  });

  describe('groupByContentType', () => {
    it('groups items by content type', () => {
      const grouped = groupByContentType(sampleItems);

      expect(grouped.video).toHaveLength(1);
      expect(grouped.article).toHaveLength(1);
      expect(grouped.image).toHaveLength(1);
      expect(grouped.music).toHaveLength(1);
    });

    it('creates empty arrays for missing types', () => {
      const oneItem = [sampleItems[0]];
      const grouped = groupByContentType(oneItem);

      expect(grouped.video).toHaveLength(1);
      expect(grouped.article).toHaveLength(0);
      expect(grouped.image).toHaveLength(0);
      expect(grouped.music).toHaveLength(0);
    });
  });

  describe('sortByRevenue', () => {
    it('sorts by revenue descending', () => {
      const result = sortByRevenue(sampleItems, 'desc');
      expect(result[0].contentId).toBe(1); // 250
      expect(result[1].contentId).toBe(4); // 160
      expect(result[3].contentId).toBe(2); // 75
    });

    it('sorts by revenue ascending', () => {
      const result = sortByRevenue(sampleItems, 'asc');
      expect(result[0].contentId).toBe(2); // 75
      expect(result[3].contentId).toBe(1); // 250
    });
  });

  describe('sortByViews', () => {
    it('sorts by views descending', () => {
      const result = sortByViews(sampleItems, 'desc');
      expect(result[0].contentId).toBe(4); // 800
      expect(result[1].contentId).toBe(1); // 500
      expect(result[3].contentId).toBe(3); // 100
    });

    it('sorts by views ascending', () => {
      const result = sortByViews(sampleItems, 'asc');
      expect(result[0].contentId).toBe(3); // 100
      expect(result[3].contentId).toBe(4); // 800
    });
  });
});
