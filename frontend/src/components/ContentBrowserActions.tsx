/**
 * ContentBrowserActions Component
 *
 * Action toolbar for ContentBrowser with export, bulk selection, and analytics features.
 * Provides creators with powerful content management capabilities.
 */

'use client';

import React, { useState } from 'react';
import { Download, BarChart3, RefreshCw } from 'lucide-react';
import { ContentItem } from '@/utils/creatorApi';
import { exportToCSV, exportToJSON, calculateExportStats } from '@/utils/contentExport';

interface ContentBrowserActionsProps {
  items: ContentItem[];
  selectedIds?: number[];
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export function ContentBrowserActions({
  items,
  selectedIds = [],
  onRefresh,
  isLoading = false,
}: ContentBrowserActionsProps) {
  const [showStats, setShowStats] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const itemsToExport = selectedIds.length > 0 
    ? items.filter((item) => selectedIds.includes(item.contentId))
    : items;

  const stats = calculateExportStats(itemsToExport);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      exportToCSV(itemsToExport, undefined, `content-export-${Date.now()}.csv`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      exportToJSON(itemsToExport, undefined, `content-export-${Date.now()}.json`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Export Options */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={itemsToExport.length === 0 || isExporting}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            title="Export as CSV"
            aria-label={`Export ${itemsToExport.length} items as CSV`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={itemsToExport.length === 0 || isExporting}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            title="Export as JSON"
            aria-label={`Export ${itemsToExport.length} items as JSON`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>

        {/* Center: Stats Toggle */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          title="Toggle statistics"
          aria-label={`${showStats ? 'Hide' : 'Show'} statistics`}
          aria-pressed={showStats}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Stats</span>
        </button>

        {/* Right: Refresh */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          title="Refresh content list"
          aria-label="Refresh content"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Statistics Panel */}
      {showStats && (
        <div
          className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-5"
          role="region"
          aria-label="Content statistics"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Items</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.count}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Total Views</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stats.totalViews.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Total Purchases</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalPurchases}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Avg Price</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.averagePrice.toFixed(2)} STX</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {stats.totalRevenue.toFixed(2)} STX
            </p>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedIds.length > 0 && (
        <p className="mt-3 text-xs text-slate-600" role="status" aria-live="polite">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected for export
        </p>
      )}
    </div>
  );
}
