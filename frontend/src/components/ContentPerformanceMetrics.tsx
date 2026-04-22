'use client';

import React, { useMemo } from 'react';
import { ContentItem } from '@/utils/creatorApi';
import { BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface ContentPerformanceMetricsProps {
  items: ContentItem[];
  isLoading?: boolean;
}

export function ContentPerformanceMetrics({ items, isLoading = false }: ContentPerformanceMetricsProps) {
  const topPerformers = useMemo(() => {
    return items
      .map((item) => ({
        title: item.title.length > 30 ? item.title.substring(0, 27) + '...' : item.title,
        revenue: item.revenue,
        views: item.views,
        purchases: item.purchases,
        engagementRate: item.views > 0 ? ((item.purchases / item.views) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [items]);

  const performanceMetrics = useMemo(() => {
    const totalViews = items.reduce((sum, item) => sum + item.views, 0);
    const totalPurchases = items.reduce((sum, item) => sum + item.purchases, 0);
    const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
    const avgEngagementRate =
      totalViews > 0
        ? ((totalPurchases / totalViews) * 100).toFixed(2)
        : '0.00';

    const topPerformer = items.length > 0
      ? items.reduce((prev, current) =>
          prev.revenue > current.revenue ? prev : current
        )
      : null;

    const lowestPerformer = items.length > 0
      ? items.reduce((prev, current) =>
          prev.revenue < current.revenue ? prev : current
        )
      : null;

    return {
      totalViews,
      totalPurchases,
      totalRevenue: totalRevenue.toFixed(2),
      avgEngagementRate,
      topPerformer,
      lowestPerformer,
      avgRevenuePerContent:
        items.length > 0 ? (totalRevenue / items.length).toFixed(2) : '0.00',
      avgViewsPerContent:
        items.length > 0
          ? Math.round(totalViews / items.length)
          : 0,
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">No content data available for performance analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Grid */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-slate-900">Content Performance Overview</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-blue-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
              Total Views
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {performanceMetrics.totalViews.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Avg {performanceMetrics.avgViewsPerContent.toLocaleString()} per content
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-emerald-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
              Total Purchases
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {performanceMetrics.totalPurchases.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Engagement {performanceMetrics.avgEngagementRate}%
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-orange-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
              Total Revenue
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {performanceMetrics.totalRevenue} STX
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Avg {performanceMetrics.avgRevenuePerContent} STX per content
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-purple-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
              Engagement Rate
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {performanceMetrics.avgEngagementRate}%
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Average across all content
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers Chart */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-slate-900">Top Performing Content</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topPerformers}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="title" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value) =>
                typeof value === 'number'
                  ? value.toFixed(2)
                  : value
              }
            />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (STX)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        {performanceMetrics.topPerformer && (
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Top Performer
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {performanceMetrics.topPerformer.title}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {performanceMetrics.topPerformer.revenue.toFixed(2)} STX revenue
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {performanceMetrics.topPerformer.views.toLocaleString()} views
            </p>
          </div>
        )}

        {performanceMetrics.lowestPerformer && (
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Needs Attention
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {performanceMetrics.lowestPerformer.title}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {performanceMetrics.lowestPerformer.revenue.toFixed(2)} STX revenue
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {performanceMetrics.lowestPerformer.views.toLocaleString()} views
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
