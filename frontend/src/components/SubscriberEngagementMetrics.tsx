'use client';

import React, { useMemo } from 'react';
import { SubscriberInfo } from '@/utils/creatorApi';
import { Users, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface SubscriberEngagementMetricsProps {
  subscribers: SubscriberInfo[];
  totalCount: number;
  isLoading?: boolean;
}

export function SubscriberEngagementMetrics({
  subscribers,
  totalCount,
  isLoading = false,
}: SubscriberEngagementMetricsProps) {
  const metrics = useMemo(() => {
    if (subscribers.length === 0) {
      return {
        averageSubscriptionValue: '0.00',
        highValueSubscribers: 0,
        recentSubscribers: 0,
        churnRisk: 0,
        retentionRate: '0.00',
        monthlyRecurringRevenue: '0.00',
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const totalAmount = subscribers.reduce((sum, sub) => sum + sub.amount, 0);
    const averageValue = (totalAmount / subscribers.length).toFixed(2);

    const highValue = subscribers.filter((sub) => sub.amount > 100).length;
    const recent = subscribers.filter(
      (sub) => new Date(sub.subscribedAt || sub.timestamp || '') > thirtyDaysAgo
    ).length;

    const expiringOrExpired = subscribers.filter((sub) => {
      const expireDate = new Date(sub.expiresAt || sub.expiry || '');
      return expireDate < now && expireDate > ninetyDaysAgo;
    }).length;

    const retention = ((subscribers.length / totalCount) * 100).toFixed(1);
    const mrr = subscribers
      .filter((sub) => {
        const expireDate = new Date(sub.expiresAt || sub.expiry || '');
        return expireDate > now;
      })
      .reduce((sum, sub) => sum + sub.amount, 0)
      .toFixed(2);

    return {
      averageSubscriptionValue: averageValue,
      highValueSubscribers: highValue,
      recentSubscribers: recent,
      churnRisk: expiringOrExpired,
      retentionRate: retention,
      monthlyRecurringRevenue: mrr,
    };
  }, [subscribers, totalCount]);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Subscriber Insights</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-blue-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  Total Subscribers
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {totalCount.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Active memberships
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-emerald-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  Monthly Recurring Revenue
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metrics.monthlyRecurringRevenue} STX
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  From active subscriptions
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-3">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-purple-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  Avg Subscription Value
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metrics.averageSubscriptionValue} STX
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Average per subscriber
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-3">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-orange-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  Retention Rate
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metrics.retentionRate}%
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Current active rate
                </p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-rose-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  Churn Risk
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metrics.churnRisk}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Expiring soon
                </p>
              </div>
              <div className="rounded-lg bg-rose-100 p-3">
                <Calendar className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-cyan-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                  High Value Subscribers
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metrics.highValueSubscribers}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Subscribers >100 STX
                </p>
              </div>
              <div className="rounded-lg bg-cyan-100 p-3">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Subscribers */}
      {subscribers.length > 0 && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent Subscribers</h3>
          <div className="mt-6 space-y-3">
            {subscribers.slice(0, 5).map((subscriber, index) => (
              <div
                key={`${subscriber.transactionId || index}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {subscriber.name || subscriber.user || 'Anonymous'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Joined {new Date(subscriber.subscribedAt || subscriber.timestamp || '').toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    {subscriber.amount.toFixed(2)} STX
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {subscriber.subscriptionTier || 'Standard'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recommendations</h3>
        <div className="mt-6 space-y-3">
          {metrics.churnRisk > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ You have {metrics.churnRisk} subscribers at risk of churning. Consider reaching out with new content to re-engage them.
              </p>
            </div>
          )}

          {metrics.highValueSubscribers > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-900">
                ✨ You have {metrics.highValueSubscribers} high-value subscribers. Consider creating premium tier content to retain them.
              </p>
            </div>
          )}

          {metrics.recentSubscribers > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-900">
                🎉 {metrics.recentSubscribers} new subscribers joined in the last 30 days. Welcome them with special content!
              </p>
            </div>
          )}

          {totalCount === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                📈 Start building your subscriber base by promoting your subscription tiers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
