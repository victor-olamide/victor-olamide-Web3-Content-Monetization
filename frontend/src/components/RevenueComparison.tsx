'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CreatorStats, RevenueSeriesPoint } from '@/utils/creatorApi';

interface RevenueComparisonProps {
  stats: CreatorStats;
  analytics: RevenueSeriesPoint[];
  isLoading?: boolean;
}

const COLORS = {
  ppv: '#3b82f6',
  subscription: '#10b981',
  total: '#f59e0b',
};

export function RevenueComparison({ stats, analytics, isLoading = false }: RevenueComparisonProps) {
  const pieData = [
    {
      name: 'PPV Revenue',
      value: stats.ppvEarnings,
      color: COLORS.ppv,
    },
    {
      name: 'Subscription Revenue',
      value: stats.subscriptionEarnings,
      color: COLORS.subscription,
    },
  ];

  const totalRevenue = stats.ppvEarnings + stats.subscriptionEarnings;
  const ppvPercentage = totalRevenue > 0 ? ((stats.ppvEarnings / totalRevenue) * 100).toFixed(1) : 0;
  const subPercentage = totalRevenue > 0 ? ((stats.subscriptionEarnings / totalRevenue) * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-40 rounded bg-slate-200" />
              <div className="h-64 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Mix Overview */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Revenue Mix</h3>
        <p className="mt-1 text-sm text-slate-600">
          Breakdown of your revenue sources
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Pie Chart */}
          <div>
            {totalRevenue > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, index }) => {
                      const percentage =
                        index === 0 ? ppvPercentage : subPercentage;
                      return `${name} ${percentage}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value.toFixed(2)} STX`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">No revenue data available</p>
              </div>
            )}
          </div>

          {/* Revenue Details */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-100 bg-blue-50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                    PPV Revenue
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {stats.ppvEarnings.toFixed(2)} STX
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {ppvPercentage}% of total
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {stats.ppvCount} transactions
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-emerald-50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                    Subscription Revenue
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {stats.subscriptionEarnings.toFixed(2)} STX
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {subPercentage}% of total
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {stats.subCount} active subscriptions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      {analytics.length > 0 && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
          <p className="mt-1 text-sm text-slate-600">
            Daily revenue breakdown over time
          </p>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? `${value.toFixed(2)} STX`
                      : value
                  }
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.total}
                  dot={false}
                  strokeWidth={2}
                  name="Total Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="ppv"
                  stroke={COLORS.ppv}
                  dot={false}
                  strokeWidth={2}
                  name="PPV"
                />
                <Line
                  type="monotone"
                  dataKey="subscription"
                  stroke={COLORS.subscription}
                  dot={false}
                  strokeWidth={2}
                  name="Subscription"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Insights */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Revenue Insights</h3>
        <div className="mt-6 space-y-3">
          {stats.ppvEarnings > stats.subscriptionEarnings ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-900">
                💡 Your PPV revenue is {((stats.ppvEarnings / stats.subscriptionEarnings - 1) * 100).toFixed(0)}% higher than subscription revenue. Consider creating more premium content to maintain this momentum.
              </p>
            </div>
          ) : stats.subscriptionEarnings > stats.ppvEarnings ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-900">
                ✅ Your subscription revenue is growing strong. Keep delivering consistent, quality content to retain subscribers.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                📊 Your revenue is balanced between PPV and subscriptions. This diversification helps stabilize your income.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              📈 Total earnings: <span className="font-semibold">{stats.totalEarnings.toFixed(2)} STX</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
