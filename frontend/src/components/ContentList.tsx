"use client";

import React from 'react';
import Link from 'next/link';
import { ContentItem } from '@/hooks/useContentSearch';

export default function ContentList({ items }: { items: ContentItem[] }) {
  if (!items || items.length === 0) {
    return <div className="text-center text-gray-500 p-6">No content found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it) => (
        <div key={it._id || String(it.contentId)} className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="h-52 bg-gray-100 overflow-hidden">
            {it.thumbnailUrl ? (
              <img
                src={it.thumbnailUrl}
                alt={it.title || 'Content preview'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No preview available
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">
              <Link href={`/content/${it.contentId}`}>{it.title || 'Untitled'}</Link>
            </h3>
            <p className="text-sm text-gray-600 mb-4">{it.description?.slice(0, 140) || 'No description available.'}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
              <span>{it.creator || 'Unknown creator'}</span>
              <span className="capitalize">{it.contentType || 'Content'}</span>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-orange-600">{typeof it.price !== 'undefined' ? `${it.price} STX` : 'Free'}</span>
              {typeof it.totalViews === 'number' && (
                <span className="text-gray-400">{it.totalViews} views</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
