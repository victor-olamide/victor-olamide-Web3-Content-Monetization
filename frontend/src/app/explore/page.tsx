"use client";

import React from 'react';
import DashboardShell from '@/components/DashboardShell';
import SearchBar from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import ContentList from '@/components/ContentList';
import { useExploreContent } from '@/hooks/useExploreContent';

export default function ExplorePage() {
  const {
    query,
    setQuery,
    selectedCategories,
    setSelectedCategories,
    results,
    loading,
    page,
    setPage,
    total,
    pages,
    error
  } = useExploreContent('');

  const handleSearch = (nextQuery: string) => {
    setQuery(nextQuery);
    setPage(1);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
    setPage(1);
  };

  return (
    <DashboardShell>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Explore Content</h1>
          <p className="mt-2 text-gray-600">
            Browse available content from creators, filter by category, and discover previews.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-8">
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Search</h2>
              <SearchBar query={query} setQuery={handleSearch} />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Categories</h2>
              <CategoryFilter
                selectedCategories={selectedCategories}
                onCategoriesChange={handleCategoryChange}
                disabled={loading}
              />
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Showing {results.length} of {total} available items
                </p>
                <p className="text-sm text-gray-400">
                  {selectedCategories.length > 0
                    ? `Filtered by ${selectedCategories.join(', ')}`
                    : 'Browse all content categories.'}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Page {page} of {pages || 1}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="animate-pulse bg-gray-100 rounded-xl h-72" />
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                  <p className="font-semibold">Unable to load explore results.</p>
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && results.length > 0 && <ContentList items={results} />}

              {!loading && !error && results.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No content matched your search and filters.
                </div>
              )}
            </div>

            {!loading && !error && results.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pages}
                    className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>

                <div className="text-sm text-gray-500">
                  {total} items · Page {page} of {pages || 1}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
