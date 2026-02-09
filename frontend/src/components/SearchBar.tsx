"use client";

import React from 'react';

export default function SearchBar({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <label className="sr-only">Search content</label>
      <input
        placeholder="Search by title, description, or creator..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-200 p-3 shadow-sm"
      />
    </div>
  );
}
