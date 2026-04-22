'use client';

import React from 'react';
import { Download, FileJson, FileText, BarChart3 } from 'lucide-react';
import { ContentItem, CreatorStats, RevenueSeriesPoint } from '@/utils/creatorApi';

interface ExportAnalyticsProps {
  content: ContentItem[];
  stats: CreatorStats;
  analytics: RevenueSeriesPoint[];
  onExport?: (format: 'csv' | 'json', type: 'content' | 'analytics' | 'combined') => void;
  isExporting?: boolean;
}

export function ExportAnalytics({
  content,
  stats,
  analytics,
  onExport,
  isExporting = false,
}: ExportAnalyticsProps) {
  const handleExportCSV = (type: 'content' | 'analytics' | 'combined') => {
    const csv = generateCSV(type);
    downloadFile(csv, `creator-${type}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    onExport?.('csv', type);
  };

  const handleExportJSON = (type: 'content' | 'analytics' | 'combined') => {
    const json = generateJSON(type);
    downloadFile(json, `creator-${type}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    onExport?.('json', type);
  };

  const generateCSV = (type: 'content' | 'analytics' | 'combined'): string => {
    let csv = '';

    if (type === 'content' || type === 'combined') {
      csv += 'Title,Description,Type,Price (STX),Views,Purchases,Revenue (STX),Created,Updated\n';
      content.forEach((item) => {
        csv += `"${item.title.replace(/"/g, '""')}","${item.description.replace(/"/g, '""')}","${item.contentType}",${item.price},${item.views},${item.purchases},${item.revenue.toFixed(2)},${item.createdAt},${item.updatedAt}\n`;
      });

      if (type === 'combined') {
        csv += '\n\n';
      }
    }

    if (type === 'analytics' || type === 'combined') {
      csv += 'Date,PPV Revenue (STX),Subscription Revenue (STX),Total Revenue (STX)\n';
      analytics.forEach((point) => {
        csv += `${point.date},${point.ppv.toFixed(2)},${point.subscription.toFixed(2)},${point.total.toFixed(2)}\n`;
      });
    }

    return csv;
  };

  const generateJSON = (type: 'content' | 'analytics' | 'combined'): string => {
    const data: any = {};

    if (type === 'content' || type === 'combined') {
      data.content = {
        total: content.length,
        items: content.map((item) => ({
          contentId: item.contentId,
          title: item.title,
          description: item.description,
          contentType: item.contentType,
          price: item.price,
          views: item.views,
          purchases: item.purchases,
          revenue: item.revenue,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    }

    if (type === 'analytics' || type === 'combined') {
      data.stats = {
        totalEarnings: stats.totalEarnings,
        ppvEarnings: stats.ppvEarnings,
        subscriptionEarnings: stats.subscriptionEarnings,
        ppvCount: stats.ppvCount,
        subCount: stats.subCount,
        currency: stats.currency,
      };

      data.analytics = analytics.map((point) => ({
        date: point.date,
        ppv: point.ppv,
        subscription: point.subscription,
        total: point.total,
      }));
    }

    if (type === 'combined') {
      data.exportDate = new Date().toISOString();
      data.summary = {
        totalContent: content.length,
        totalViews: content.reduce((sum, item) => sum + item.views, 0),
        totalRevenue: stats.totalEarnings,
        subscribers: stats.subCount,
      };
    }

    return JSON.stringify(data, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Export Data</h3>
          <p className="mt-1 text-sm text-slate-600">
            Download your dashboard data in CSV or JSON format
          </p>
        </div>
        <Download className="h-6 w-6 text-slate-400" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Content Export */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-slate-900">Content Data</h4>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Export all your content list and performance metrics
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportCSV('content')}
              disabled={isExporting || content.length === 0}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportJSON('content')}
              disabled={isExporting || content.length === 0}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              JSON
            </button>
          </div>
        </div>

        {/* Analytics Export */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-slate-900">Analytics Data</h4>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Export revenue and subscriber analytics
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportCSV('analytics')}
              disabled={isExporting || analytics.length === 0}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportJSON('analytics')}
              disabled={isExporting || analytics.length === 0}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              JSON
            </button>
          </div>
        </div>

        {/* Combined Export */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-slate-900">Full Report</h4>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Export complete dashboard report with summary
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportCSV('combined')}
              disabled={isExporting || (content.length === 0 && analytics.length === 0)}
              className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportJSON('combined')}
              disabled={isExporting || (content.length === 0 && analytics.length === 0)}
              className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-900">
          💡 <span className="font-medium">Tip:</span> JSON exports include richer metadata and are ideal for data analysis tools. CSV exports are compatible with Excel and Google Sheets.
        </p>
      </div>
    </div>
  );
}
