'use client';

import { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ContentItem, RevenueSeriesPoint } from '@/utils/creatorApi';

function formatTick(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function ChartFrame({
  title,
  subtitle,
  loading = false,
  children,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-4 w-60 rounded bg-slate-100" />
          <div className="h-[300px] rounded-[1.5rem] bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function RevenueChart({
  data,
  loading = false,
}: {
  data: RevenueSeriesPoint[];
  loading?: boolean;
}) {
  if (!loading && data.length === 0) {
    return (
      <ChartFrame
        title="Revenue trend"
        subtitle="Track pay-per-view and subscription earnings across the last 30 days."
      >
        <div className="flex h-[300px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Revenue data will appear here once transactions start landing.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Revenue trend"
      subtitle="Track pay-per-view and subscription earnings across the last 30 days."
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="creatorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatTick} stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            labelFormatter={(value) => formatTick(String(value))}
            contentStyle={{
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#0891b2"
            strokeWidth={3}
            fill="url(#creatorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueMixChart({
  data,
  loading = false,
}: {
  data: RevenueSeriesPoint[];
  loading?: boolean;
}) {
  if (!loading && data.length === 0) {
    return (
      <ChartFrame
        title="Revenue mix"
        subtitle="Compare direct purchase revenue against subscriptions."
      >
        <div className="flex h-[300px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Mix data will appear after your first purchases or subscriptions.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Revenue mix"
      subtitle="Compare direct purchase revenue against subscriptions."
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatTick} stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            labelFormatter={(value) => formatTick(String(value))}
            contentStyle={{
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            }}
          />
          <Bar dataKey="ppv" stackId="revenue" fill="#0f172a" radius={[10, 10, 0, 0]} />
          <Bar dataKey="subscription" stackId="revenue" fill="#22c55e" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function TopContentChart({
  topContent,
  loading = false,
}: {
  topContent: ContentItem[];
  loading?: boolean;
}) {
  const chartData = topContent.slice(0, 5).map((item) => ({
    name: item.title.length > 18 ? `${item.title.slice(0, 18)}...` : item.title,
    fullTitle: item.title,
    revenue: item.revenue,
    views: item.views,
  }));

  if (!loading && chartData.length === 0) {
    return (
      <ChartFrame
        title="Top content"
        subtitle="Your best-performing uploads by revenue and audience reach."
      >
        <div className="flex h-[300px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Uploads with audience activity will appear here.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Top content"
      subtitle="Your best-performing uploads by revenue and audience reach."
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#64748b" />
          <YAxis type="category" dataKey="name" stroke="#64748b" width={110} />
          <Tooltip
            contentStyle={{
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            }}
            formatter={(value: number) => [`${Number(value).toFixed(2)} STX`, 'Revenue']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle || ''}
          />
          <Bar dataKey="revenue" fill="#f97316" radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
