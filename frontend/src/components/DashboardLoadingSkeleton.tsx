'use client';

import React from 'react';

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Hero */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8">
        <div className="space-y-4">
          <div className="h-8 w-40 rounded bg-slate-200" />
          <div className="h-10 w-3/4 rounded bg-slate-100" />
          <div className="h-6 w-2/3 rounded bg-slate-100" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-8 w-32 rounded bg-slate-100" />
              <div className="h-4 w-24 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Charts */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <div className="space-y-4">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="h-64 rounded-lg bg-slate-100" />
          </div>
        </div>

        {/* Side Panel */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <div className="space-y-4">
            <div className="h-6 w-40 rounded bg-slate-200" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-slate-200" />
              <div className="h-64 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Content Table */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MiniLoadingSkeleton() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="h-32 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
