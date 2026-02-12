import React, { useState } from 'react';
import { CategoryFilter } from '../components/CategoryFilter';
import { PriceRangeFilter } from '../components/PriceRangeFilter';
import { FilterBar } from '../components/FilterBar';
import { useFilters } from '../hooks/useFilters';
import { ChevronUp, ChevronDown, Grid, List } from 'lucide-react';

/**
 * ContentBrowser Page
 * Advanced content browsing with filters, search, and sorting
 */
export function ContentBrowser() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);

  const {
    filters,
    results,
    pagination,
    isLoading,
    error,
    setCategories,
    setPriceRange,
    setSearchTerm,
    setSortBy,
    clearAllFilters,
    goToPage,
    nextPage,
    prevPage,
    hasActiveFilters,
    totalResults
  } = useFilters();

  // Handle filter removals
  const handleRemoveCategory = (category: string) => {
    setCategories(filters.categories.filter((c) => c !== category));
  };

  const handleRemovePrice = () => {
    setPriceRange(null, null);
  };

  const handleRemoveSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Browser</h1>
              <p className="mt-2 text-gray-600">
                Discover and filter {totalResults} pieces of content
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Bar */}
      {hasActiveFilters() && (
        <FilterBar
          activeCategories={filters.categories}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          searchTerm={filters.searchTerm}
          onRemoveCategory={handleRemoveCategory}
          onRemovePrice={handleRemovePrice}
          onRemoveSearch={handleRemoveSearch}
          onClearAll={clearAllFilters}
          disabled={isLoading}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          {showFilters && (
            <div className="md:col-span-1">
              <div className="sticky top-8 space-y-4">
                <CategoryFilter
                  selectedCategories={filters.categories}
                  onCategoriesChange={setCategories}
                  disabled={isLoading}
                />

                <PriceRangeFilter
                  minPrice={filters.minPrice}
                  maxPrice={filters.maxPrice}
                  onPriceRangeChange={setPriceRange}
                  disabled={isLoading}
                />

                {/* Sorting Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Sort By</h3>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="createdAt">Newest</option>
                    <option value="price">Price (Low to High)</option>
                    <option value="title">Title (A to Z)</option>
                    <option value="totalViews">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="md:col-span-3">
            {/* Results Header */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {results.length} Results
                </h2>
                {filters.searchTerm && (
                  <p className="text-sm text-gray-600">
                    Searching for "{filters.searchTerm}"
                  </p>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Grid view"
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="List view"
                >
                  <List size={20} />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm animate-pulse"
                  >
                    <div className="w-full h-40 bg-gray-200 rounded-t-lg" />
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && results.length === 0 && (
              <div className="p-12 text-center bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No content found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search criteria
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Results Grid/List */}
            {!isLoading && !error && results.length > 0 && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {results.map((item) => (
                  <div
                    key={item._id}
                    className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                      viewMode === 'list' ? 'p-4 flex gap-4' : 'overflow-hidden'
                    }`}
                  >
                    {/* Thumbnail */}
                    {item.thumbnailUrl && (
                      <div className={viewMode === 'list' ? 'flex-shrink-0' : ''}>
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className={`w-full h-40 object-cover rounded ${
                            viewMode === 'list'
                              ? 'w-32 h-32'
                              : ''
                          }`}
                        />
                      </div>
                    )}

                    {/* Content Info */}
                    <div className={viewMode === 'list' ? 'flex-1' : 'p-4'}>
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        by <span className="font-medium">{item.creator}</span>
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-blue-600">
                          ${item.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          👁️ {item.totalViews}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && results.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={prevPage}
                  disabled={pagination.page === 1 || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp size={20} />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, pagination.page - 2),
                      Math.min(pagination.totalPages, pagination.page + 1)
                    )
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          pagination.page === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>

                <button
                  onClick={nextPage}
                  disabled={!pagination.hasNextPage || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            )}

            {/* Page Info */}
            {!isLoading && !error && results.length > 0 && (
              <div className="mt-4 text-center text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total results)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
