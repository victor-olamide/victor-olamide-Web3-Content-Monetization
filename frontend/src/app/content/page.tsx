"use client";

import React from 'react';
import DashboardShell from '@/components/DashboardShell';
import SearchBar from '@/components/SearchBar';
import ContentList from '@/components/ContentList';
import useContentSearch from '@/hooks/useContentSearch';

export default function ContentIndexPage() {
  const { query, setQuery, results, loading, page, setPage, total } = useContentSearch('');

  return (
    <DashboardShell>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Discover Content</h1>
        <p className="text-gray-600 mb-6">Search, filter and find content from creators.</p>

        <SearchBar query={query} setQuery={setQuery} />

        <div className="mb-4 text-sm text-gray-500">{total} results</div>

        {loading ? (
          <div className="p-8 text-center">Loading results...</div>
        ) : (
          <ContentList items={results} />
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {page}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-1 rounded border">Prev</button>
            <button onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border">Next</button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
