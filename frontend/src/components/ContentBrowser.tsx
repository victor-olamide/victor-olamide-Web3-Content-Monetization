'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Eye, ExternalLink, Trash2, Edit } from 'lucide-react';
import { ContentItem, CreatorContentType } from '@/utils/creatorApi';

interface ContentBrowserProps {
  items: ContentItem[];
  isLoading?: boolean;
  onEdit?: (item: ContentItem) => void;
  onDelete?: (contentId: number) => Promise<boolean>;
  isDeletingId?: number | null;
}

type SortField = 'date' | 'views' | 'revenue' | 'price';
type SortOrder = 'asc' | 'desc';
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

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.contentType === filterType);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.updatedAt || a.createdAt).getTime();
          bVal = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'views':
          aVal = a.views;
          bVal = b.views;
          break;
        case 'revenue':
          aVal = a.revenue;
          bVal = b.revenue;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [items, filterType, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Recently';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getContentTypeLabel = (type: CreatorContentType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getContentTypeColor = (type: CreatorContentType) => {
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
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="video">Videos</option>
            <option value="article">Articles</option>
            <option value="image">Images</option>
            <option value="music">Music</option>
          </select>
        </div>

        {/* Result count */}
        <p className="text-xs font-medium text-slate-500">
          Showing {filteredAndSortedItems.length} of {items.length} items
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
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-2 px-6 py-4 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th>
                <button
                  onClick={() => handleSort('views')}
                  className="flex items-center gap-2 px-6 py-4 font-semibold text-slate-700 hover:text-slate-900"
                >
                  Views
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th>
                <button
                  onClick={() => handleSort('revenue')}
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
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    {searchQuery || filterType !== 'all'
                      ? 'No content matches your filters'
                      : 'No content uploaded yet'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => (
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
                        >
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                      )}
                      <button
                        onClick={() => onEdit?.(item)}
                        className="rounded-md p-2 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => onDelete?.(item.contentId)}
                        disabled={isDeletingId === item.contentId}
                        className="rounded-md p-2 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2
                          className={`h-4 w-4 ${isDeletingId === item.contentId ? 'text-slate-300' : 'text-slate-500'}`}
                        />
                      </button>
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
