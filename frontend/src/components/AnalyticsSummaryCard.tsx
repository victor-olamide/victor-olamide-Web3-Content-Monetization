'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface AnalyticsSummaryMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  tint?: string;
}

interface AnalyticsSummaryCardProps {
  title: string;
  metrics: AnalyticsSummaryMetric[];
  isLoading?: boolean;
  onExport?: () => void;
}

export function AnalyticsSummaryCard({
  title,
  metrics,
  isLoading = false,
  onExport,
}: AnalyticsSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-100 p-4">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="mt-2 h-6 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition"
          >
            Export
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`rounded-2xl border border-slate-100 p-5 ${metric.tint || 'bg-slate-50'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  {metric.label}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                  {metric.unit && <p className="text-sm text-slate-600">{metric.unit}</p>}
                </div>

                {metric.change && (
                  <div className="mt-3 flex items-center gap-1">
                    {metric.change.isPositive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        metric.change.isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {metric.change.isPositive ? '+' : '-'}
                      {Math.abs(metric.change.value).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500">vs. previous period</span>
                  </div>
                )}
              </div>
              {metric.icon && <div className="text-slate-600">{metric.icon}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
