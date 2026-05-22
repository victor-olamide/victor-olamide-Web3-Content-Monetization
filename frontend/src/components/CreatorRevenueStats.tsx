'use client';

import React from 'react';
import { TrendingUp, DollarSign, BarChart3, Zap } from 'lucide-react';
import { CreatorStats } from '@/utils/creatorApi';

interface CreatorRevenueStatsProps {
  stats: CreatorStats | null;
  loading?: boolean;
  currency?: string;
}

/**
 * Component to display creator revenue statistics
 */
export function CreatorRevenueStats({
  stats,
  loading = false,
  currency = 'STX'
}: CreatorRevenueStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        No revenue data available
      </div>
    );
  }

  const statCards = [
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `${stats.totalEarnings.toFixed(2)} ${currency}`,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: 'positive'
    },
    {
      icon: BarChart3,
      label: 'PPV Earnings',
      value: `${stats.ppvEarnings.toFixed(2)} ${currency}`,
      subtitle: `${stats.ppvCount} sales`,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: 'neutral'
    },
    {
      icon: Zap,
      label: 'Subscription Earnings',
      value: `${stats.subscriptionEarnings.toFixed(2)} ${currency}`,
      subtitle: `${stats.subCount} subscriptions`,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: 'neutral'
    },
    {
      icon: TrendingUp,
      label: 'Average Price',
      value: `${((stats.ppvEarnings + stats.subscriptionEarnings) / (stats.ppvCount + stats.subCount) || 0).toFixed(2)} ${currency}`,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      trend: 'neutral'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">{card.label}</p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.trend === 'positive' && (
                <span className="text-xs text-green-600 font-medium">+12%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version of revenue stats for dashboard headers
 */
interface CompactRevenueStatsProps {
  stats: CreatorStats | null;
  loading?: boolean;
}

export function CompactRevenueStats({
  stats,
  loading = false
}: CompactRevenueStatsProps) {
  if (loading || !stats) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="h-4 bg-blue-200 rounded w-1/3 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
      <div className="flex items-center justify-between gap-8">
        <div>
          <p className="text-sm text-gray-600">Total Earnings</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats.totalEarnings.toFixed(2)} STX
          </p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider">PPV Sales</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.ppvCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Subscribers</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.subCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
