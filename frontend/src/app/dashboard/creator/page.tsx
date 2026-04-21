'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Coins, RefreshCcw, Sparkles, UploadCloud, Users } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { CreatorContentEditor, CreatorContentEditorTrigger } from '@/components/CreatorContentEditor';
import { CreatorContentTable } from '@/components/CreatorContentTable';
import { RevenueChart, RevenueMixChart, TopContentChart } from '@/components/ContentAnalyticsChart';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorDashboard } from '@/hooks/useCreatorDashboard';
import { ContentItem } from '@/utils/creatorApi';

function formatGrowth(value: string | number | undefined) {
  if (value === undefined) {
    return '0%';
  }

  return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
}

function formatSubscriberDate(value?: string) {
  if (!value) {
    return 'Recently';
  }

  return new Date(value).toLocaleDateString();
}

export default function CreatorDashboardPage() {
  const { stxAddress, isLoggedIn, authenticate } = useAuth();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);

  const {
    content,
    metrics,
    loading,
    saving,
    deletingId,
    error,
    refresh,
    saveContent,
    removeContent,
    totals,
  } = useCreatorDashboard(stxAddress);

  const topContent = useMemo(
    () => [...content].sort((a, b) => b.revenue - a.revenue || b.views - a.views).slice(0, 5),
    [content]
  );

  const statCards = [
    {
      label: 'Total revenue',
      value: `${metrics?.earnings.totalEarnings.toFixed(2) || '0.00'} STX`,
      detail: `${metrics?.earnings.ppvCount || 0} PPV sales`,
      icon: Coins,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Subscribers',
      value: String(metrics?.subscribers.count || 0),
      detail: `${formatGrowth(metrics?.growth.growth)} vs previous period`,
      icon: Users,
      tint: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: 'Uploaded content',
      value: String(content.length),
      detail: `${totals.averagePrice.toFixed(2)} STX avg price`,
      icon: UploadCloud,
      tint: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Conversion rate',
      value: `${totals.conversionRate.toFixed(1)}%`,
      detail: `${totals.totalPurchases} purchases from ${totals.totalViews} views`,
      icon: BarChart3,
      tint: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <DashboardShell>
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-900 px-6 py-8 text-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] sm:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Creator Dashboard
                </p>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Manage uploads, track revenue, and watch your audience build in real time.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  This workspace brings your uploaded content, subscriber count, revenue stats, and
                  analytics charts together so you can publish and iterate from one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh metrics
                </button>
                {!isLoggedIn || !stxAddress ? (
                  <button
                    type="button"
                    onClick={authenticate}
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                  >
                    Connect wallet
                  </button>
                ) : (
                  <CreatorContentEditorTrigger
                    onClick={() => {
                      setEditingContent(null);
                      setIsEditorOpen(true);
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          {!isLoggedIn || !stxAddress ? (
            <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-14 text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Wallet Required
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                Connect your creator wallet to load dashboard data
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                The creator earnings, subscriber, analytics, upload, edit, and delete endpoints all
                use your creator address, so we need the connected wallet before we can fetch or
                update anything here.
              </p>
              <button
                type="button"
                onClick={authenticate}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Connect wallet
              </button>
            </section>
          ) : (
            <>
              {error ? (
                <div className="mt-8 rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.label}
                      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-500">{card.label}</p>
                          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                            {loading ? '...' : card.value}
                          </h2>
                          <p className="mt-3 text-sm text-slate-600">{card.detail}</p>
                        </div>
                        <div className={`rounded-2xl p-3 ${card.tint}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <RevenueChart data={metrics?.analytics || []} loading={loading} />

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Recent subscribers</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Latest paid supporters and active recurring revenue momentum.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {metrics?.subscribers.count || 0} total
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {(metrics?.subscribers.subscribers || []).slice(0, 5).map((subscriber, index) => (
                      <div
                        key={`${subscriber.transactionId || subscriber.user || index}`}
                        className="flex items-center justify-between rounded-[1.5rem] bg-slate-50 px-4 py-4"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{subscriber.user || subscriber.name || 'Supporter'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Joined {formatSubscriberDate(subscriber.timestamp || subscriber.subscribedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600">{subscriber.amount.toFixed(2)} STX</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {subscriber.subscriptionTier || 'Subscriber'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {!loading && (metrics?.subscribers.subscribers || []).length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        Subscriber activity will show up here as soon as memberships start coming in.
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-2">
                <RevenueMixChart data={metrics?.analytics || []} loading={loading} />
                <TopContentChart topContent={topContent} loading={loading} />
              </section>

              <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                      Content Management
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      Upload, edit, and delete from your creator library
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                      The table below is wired to your creator content API so each upload and edit
                      updates the same source of truth that powers the dashboard analytics.
                    </p>
                  </div>
                  <CreatorContentEditorTrigger
                    onClick={() => {
                      setEditingContent(null);
                      setIsEditorOpen(true);
                    }}
                  />
                </div>

                <div className="mt-6">
                  <CreatorContentTable
                    content={content}
                    loading={loading}
                    deletingId={deletingId}
                    onDelete={removeContent}
                    onEdit={(item) => {
                      setEditingContent(item);
                      setIsEditorOpen(true);
                    }}
                    onUpload={() => {
                      setEditingContent(null);
                      setIsEditorOpen(true);
                    }}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <CreatorContentEditor
        open={isEditorOpen}
        content={editingContent}
        saving={saving}
        onClose={() => {
          setEditingContent(null);
          setIsEditorOpen(false);
        }}
        onSubmit={saveContent}
      />
    </DashboardShell>
  );
}
