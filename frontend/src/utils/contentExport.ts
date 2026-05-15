/**
 * ContentBrowser Export Utilities
 *
 * Helper functions for exporting ContentBrowser data to CSV, JSON, and other formats.
 * Useful for creators to download their content analytics for offline analysis.
 */

import { ContentItem } from '@/utils/creatorApi';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeFields: (keyof ContentItem)[];
  filename?: string;
}

const DEFAULT_FIELDS: (keyof ContentItem)[] = [
  'contentId',
  'title',
  'contentType',
  'price',
  'views',
  'revenue',
  'purchases',
  'updatedAt',
];

/**
 * Export content items to CSV format
 */
export function exportToCSV(
  items: ContentItem[],
  fields: (keyof ContentItem)[] = DEFAULT_FIELDS,
  filename: string = 'content-export.csv'
): void {
  if (items.length === 0) {
    console.warn('No items to export');
    return;
  }

  const headers = fields;
  const rows = items.map((item) =>
    fields.map((field) => {
      const value = item[field];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export content items to JSON format
 */
export function exportToJSON(
  items: ContentItem[],
  fields: (keyof ContentItem)[] = DEFAULT_FIELDS,
  filename: string = 'content-export.json'
): void {
  if (items.length === 0) {
    console.warn('No items to export');
    return;
  }

  const filtered = items.map((item) => {
    const obj: Partial<ContentItem> = {};
    fields.forEach((field) => {
      obj[field] = item[field];
    });
    return obj;
  });

  const jsonContent = JSON.stringify(filtered, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Calculate aggregate statistics for exported content
 */
export function calculateExportStats(items: ContentItem[]) {
  if (items.length === 0) {
    return {
      count: 0,
      totalViews: 0,
      totalRevenue: 0,
      totalPurchases: 0,
      averagePrice: 0,
    };
  }

  return {
    count: items.length,
    totalViews: items.reduce((sum, item) => sum + item.views, 0),
    totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
    totalPurchases: items.reduce((sum, item) => sum + item.purchases, 0),
    averagePrice: items.reduce((sum, item) => sum + item.price, 0) / items.length,
  };
}

/**
 * Helper function to trigger browser download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType}base64,${btoa(unescape(encodeURIComponent(content)))}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
