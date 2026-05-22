// Dashboard utility functions

import { ContentType } from '@/types/dashboard';

/**
 * Format large numbers with appropriate units (K, M, B)
 */
export function formatNumber(value: number, decimals = 1): string {
  const units = [
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' },
  ];

  for (const unit of units) {
    if (Math.abs(value) >= unit.value) {
      return (value / unit.value).toFixed(decimals) + unit.symbol;
    }
  }

  return value.toFixed(decimals);
}

/**
 * Format currency values
 */
export function formatCurrency(value: number, currency = 'STX'): string {
  return `${value.toFixed(2)} ${currency}`;
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number | string | undefined): string {
  if (value === undefined) {
    return '0%';
  }

  return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
}

/**
 * Format date to locale string
 */
export function formatDate(date?: string | Date, format: 'short' | 'long' = 'short'): string {
  if (!date) {
    return 'Recently';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate time ago string (e.g., "2 hours ago")
 */
export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;

  return `${Math.floor(seconds / 2592000)}mo ago`;
}

/**
 * Get color class for content type
 */
export function getContentTypeColor(type: ContentType): string {
  switch (type) {
    case 'video':
      return 'bg-red-50 text-red-700';
    case 'article':
      return 'bg-blue-50 text-blue-700';
    case 'image':
      return 'bg-purple-50 text-purple-700';
    case 'music':
      return 'bg-orange-50 text-orange-700';
    default:
      return 'bg-slate-50 text-slate-700';
  }
}

/**
 * Get content type label
 */
export function getContentTypeLabel(type: ContentType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(views: number, purchases: number): number {
  if (views === 0) return 0;
  return (purchases / views) * 100;
}

/**
 * Calculate growth percentage
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Round number to specified decimal places
 */
export function roundNumber(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean;
  error?: string;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }

  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  const maxDays = 365;
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff > maxDays) {
    return { valid: false, error: `Date range cannot exceed ${maxDays} days` };
  }

  return { valid: true };
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncateString(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sort array of objects by field
 */
export function sortByField<T extends Record<string, any>>(
  array: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter array by text search across multiple fields
 */
export function filterBySearch<T extends Record<string, any>>(
  array: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return array;

  const lowerQuery = query.toLowerCase();

  return array.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get dashboard color scheme
 */
export const dashboardColors = {
  ppv: '#3b82f6',
  subscription: '#10b981',
  total: '#f59e0b',
  primary: '#1e293b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

/**
 * Calculate average
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

/**
 * Calculate total
 */
export function calculateTotal(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}

/**
 * Get percentile rank
 */
export function getPercentileRank(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.filter((v) => v <= value).length;
  return (count / values.length) * 100;
}
