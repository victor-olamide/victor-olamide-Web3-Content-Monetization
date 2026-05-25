/**
 * Content type constants and utilities for the creator dashboard
 */

export const CONTENT_TYPE_COLORS = {
  video: 'bg-red-50 text-red-700',
  article: 'bg-blue-50 text-blue-700',
  image: 'bg-purple-50 text-purple-700',
  music: 'bg-orange-50 text-orange-700',
  default: 'bg-slate-50 text-slate-700',
} as const;

export const CONTENT_TYPE_LABELS = {
  video: 'Video',
  article: 'Article',
  image: 'Image',
  music: 'Music',
} as const;

export const SORT_FIELDS = ['date', 'views', 'revenue', 'price'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type SortField = typeof SORT_FIELDS[number];
export type SortOrder = typeof SORT_ORDERS[number];
