'use client';

import React from 'react';
import { Users, TrendingUp, Mail, CheckCircle } from 'lucide-react';
import { SubscriberInfo } from '@/utils/creatorApi';

interface CreatorSubscriberStatsProps {
  subscriberCount: number;
  subscribers: SubscriberInfo[];
  loading?: boolean;
}

/**
 * Component to display subscriber statistics
 */
export function CreatorSubscriberStats({
  subscriberCount,
  subscribers,
  loading = false
}: CreatorSubscriberStatsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  // Calculate stats
  const activeSubscribers = subscribers.filter(
    s => new Date(s.expiresAt) > new Date()
  ).length;

  const monthlyRecurring = subscribers
    .filter(s => new Date(s.expiresAt) > new Date())
    .reduce((sum, s) => sum + s.amount, 0);

  const topTier = subscribers.length > 0
    ? [...subscribers]
        .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime())
        .slice(0, 1)[0]?.subscriptionTier || 'N/A'
    : 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Subscriber Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Subscribers</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900">{subscriberCount}</p>
        <p className="text-xs text-gray-500 mt-2">
          {activeSubscribers} active • {subscriberCount - activeSubscribers} expired
        </p>
      </div>

      {/* Monthly Recurring Revenue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Monthly Recurring</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900">{monthlyRecurring.toFixed(2)} STX</p>
        <p className="text-xs text-gray-500 mt-2">
          From {activeSubscribers} active subscribers
        </p>
      </div>

      {/* Recent Subscribers */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Subscribers</h3>
        {subscribers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No subscribers yet. Start growing your audience!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscribers.slice(0, 5).map((subscriber, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {subscriber.name?.charAt(0) || subscriber.email?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{subscriber.name}</p>
                    <p className="text-xs text-gray-500 truncate">{subscriber.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {subscriber.subscriptionTier}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(subscriber.subscribedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {subscribers.length > 5 && (
              <div className="text-center pt-4 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all {subscribers.length} subscribers
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Subscriber status badge
 */
export function SubscriberStatusBadge({
  status
}: {
  status: 'active' | 'expired' | 'pending';
}) {
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' }
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
      <CheckCircle className="w-3 h-3 mr-1" />
      {label}
    </span>
  );
}
