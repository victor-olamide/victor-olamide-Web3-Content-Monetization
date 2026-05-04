'use client';

import React, { useState } from 'react';
import useContentSearch from '@/hooks/useContentSearch';
import ContentList from '@/components/ContentList';
import { Search } from 'lucide-react';

const ContentSearch: React.FC = () => {
  const { filters, setFilter, results, loading, error, pageInfo, setFilter: setF } = useContentSearch({ page: 1, limit: 12 });
  const [query, setQuery] = useState(filters.q || '');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ q: query, page: 1 });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search content by title or description"
          className="flex-1 px-4 py-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded flex items-center gap-2">
          <Search size={16} />
          Search
        </button>
      </form>

      <div>
        {loading && <div>Searching...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && results.length === 0 && <div className="text-gray-600">No results</div>}

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item: any) => (
                <div key={item.contentId} className="p-4 border rounded bg-white">
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="text-xs text-gray-500 mt-2">{item.contentType} • {item.price} STX</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Page {pageInfo.page} of {pageInfo.pages}</div>
              <div className="flex gap-2">
                <button
                  disabled={pageInfo.page <= 1}
                  onClick={() => setFilter({ page: pageInfo.page - 1 })}
                  className="px-3 py-1 rounded border"
                >Prev</button>
                <button
                  disabled={pageInfo.page >= pageInfo.pages}
                  onClick={() => setFilter({ page: pageInfo.page + 1 })}
                  className="px-3 py-1 rounded border"
                >Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentSearch;
