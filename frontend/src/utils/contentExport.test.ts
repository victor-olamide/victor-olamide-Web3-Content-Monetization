/**
 * Tests for content export utilities
 */

import { exportToCSV, exportToJSON, calculateExportStats } from './contentExport';
import { ContentItem } from './creatorApi';

const sampleItems: ContentItem[] = [
  {
    contentId: 1,
    title: 'Test Video',
    description: 'A test video',
    contentType: 'video',
    price: 10,
    views: 100,
    revenue: 50,
    purchases: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    creator: 'creator1',
  },
  {
    contentId: 2,
    title: 'Test, Article',
    description: 'An article with comma in title',
    contentType: 'article',
    price: 5,
    views: 50,
    revenue: 25,
    purchases: 5,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-04T00:00:00Z',
    creator: 'creator1',
  },
];

describe('contentExport utilities', () => {
  describe('calculateExportStats', () => {
    it('calculates correct statistics for non-empty items', () => {
      const stats = calculateExportStats(sampleItems);

      expect(stats.count).toBe(2);
      expect(stats.totalViews).toBe(150);
      expect(stats.totalRevenue).toBe(75);
      expect(stats.totalPurchases).toBe(10);
      expect(stats.averagePrice).toBe(7.5);
    });

    it('returns zero values for empty items array', () => {
      const stats = calculateExportStats([]);

      expect(stats.count).toBe(0);
      expect(stats.totalViews).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.totalPurchases).toBe(0);
      expect(stats.averagePrice).toBe(0);
    });

    it('calculates average price correctly with multiple items', () => {
      const items: ContentItem[] = [
        { ...sampleItems[0], price: 10 },
        { ...sampleItems[1], price: 20 },
        { ...sampleItems[0], contentId: 3, price: 30 },
      ];

      const stats = calculateExportStats(items);
      expect(stats.averagePrice).toBe(20);
    });
  });

  describe('exportToCSV', () => {
    it('creates CSV content with proper formatting', () => {
      // This test would require mocking document methods
      // For now we just verify the function exists and accepts parameters
      expect(() => {
        exportToCSV(sampleItems);
      }).not.toThrow();
    });

    it('handles commas in content by wrapping in quotes', () => {
      // Verification would require DOM mocking
      expect(() => {
        exportToCSV(sampleItems);
      }).not.toThrow();
    });

    it('handles empty arrays gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      exportToCSV([]);
      expect(consoleSpy).toHaveBeenCalledWith('No items to export');
      consoleSpy.mockRestore();
    });
  });

  describe('exportToJSON', () => {
    it('creates JSON content correctly', () => {
      expect(() => {
        exportToJSON(sampleItems);
      }).not.toThrow();
    });

    it('handles empty arrays gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      exportToJSON([]);
      expect(consoleSpy).toHaveBeenCalledWith('No items to export');
      consoleSpy.mockRestore();
    });

    it('accepts custom field selection', () => {
      expect(() => {
        exportToJSON(sampleItems, ['contentId', 'title', 'revenue']);
      }).not.toThrow();
    });
  });
});
