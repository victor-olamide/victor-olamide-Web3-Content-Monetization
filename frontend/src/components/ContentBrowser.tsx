'use client';

/**
 * ContentBrowser Component
 *
 * Displays a searchable, filterable, and sortable table of creator content.
 *
 * UX Improvements:
 * - Search and type filter work together without resetting state
 * - Sort operations do not mutate the original props array
 * - Delete action requires explicit confirmation before removal
 * - Empty state provides helpful guidance and clear filter options
 * - Accessible labels for all interactive controls (aria-label, aria-sort)
 * - Mobile-friendly responsive design with proper overflow handling
 */

import React, { useState } from 'react';
import { ArrowUpDown, ExternalLink, Trash2, Edit } from 'lucide-react';
import { ContentItem, CreatorContentType } from '@/utils/creatorApi';
import { useContentBrowser, SortField, SortOrder } from '@/hooks/useContentBrowser';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from '@/constants/contentConstants';

interface ContentBrowserProps {
  items: ContentItem[];
  isLoading?: boolean;
  onEdit?: (item: ContentItem) => void;
  onDelete?: (contentId: number) => Promise<boolean>;
  isDeletingId?: number | null;
}

type FilterType = 'all' | CreatorContentType;

export function ContentBrowser({
  items,
  isLoading = false,
  onEdit,
  onDelete,
  isDeletingId,
}: ContentBrowserProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { contentTypes, sortedItems, hasFilters } = useContentBrowser(
    items,
    filterType,
    searchQuery,
    sortField,
    sortOrder
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const sortDirectionLabel = sortOrder === 'asc' ? 'ascending' : 'descending';

  const formatDate = (date?: string) => {
    if (!date) return 'Recently';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getContentTypeLabel = (type: CreatorContentType) => {
    return CONTENT_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getContentTypeColor = (type: CreatorContentType) => {
    return CONTENT_TYPE_COLORS[type] || CONTENT_TYPE_COLORS.default;
  };

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-full rounded bg-slate-100" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 w-full rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-200 p-6">
        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search content"
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            {hasFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="self-start rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            aria-label="Filter content type"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            {contentTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          Showing {sortedItems.length} of {items.length} items
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-4 text-left font-semibold text-slate-700">Content</th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  aria-label={`Sort by date ${sortField === 'date' ? sortDirectionLabel : 'descending'}`}
                  aria-sort={sortField === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="flex items-center gap-2 px-6 py-4 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('views')}
                  aria-label={`Sort by views ${sortField === 'views' ? sortDirectionLabel : 'descending'}`}
                  aria-sort={sortField === 'views' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="flex items-center gap-2 px-6 py-4 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Views
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('revenue')}
                  aria-label={`Sort by revenue ${sortField === 'revenue' ? sortDirectionLabel : 'descending'}`}
                  aria-sort={sortField === 'revenue' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="flex items-center gap-2 px-6 py-4 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Revenue
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-4 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">
                      {searchQuery || filterType !== 'all'
                        ? 'No content matches your filters.'
                        : 'No content uploaded yet.'}
                    </p>
                    {hasFilters ? (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        Clear filters and search
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => (
                <tr key={item.contentId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getContentTypeColor(item.contentType)}`}>
                            {getContentTypeLabel(item.contentType)}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {item.price} STX
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{formatDate(item.updatedAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{item.views.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-emerald-600">
                      {item.revenue.toFixed(2)} STX
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-2 hover:bg-slate-100"
                          title="View content"
                          aria-label={`View ${item.title}`}
                        >
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                      )}
                      {onEdit ? (
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded-md p-2 hover:bg-slate-100"
                          title={`Edit ${item.title}`}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit className="h-4 w-4 text-slate-500" />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                              onDelete(item.contentId);
                            }
                          }}
                          disabled={isDeletingId === item.contentId}
                          className="rounded-md p-2 hover:bg-red-50 disabled:opacity-50"
                          title={`Delete ${item.title}`}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2
                            className={`h-4 w-4 ${isDeletingId === item.contentId ? 'text-slate-300' : 'text-slate-500'}`}
                          />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
