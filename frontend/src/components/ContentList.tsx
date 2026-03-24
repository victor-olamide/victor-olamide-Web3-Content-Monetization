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
        <div key={it._id || String(it.contentId)} className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                <Link href={`/content/${it.contentId}`}>{it.title || 'Untitled'}</Link>
              </h3>
              <p className="text-sm text-gray-600">{it.description?.slice(0, 140)}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{it.contentType}</div>
              <div className="text-orange-600 font-bold mt-2">{typeof it.price !== 'undefined' ? `${it.price} STX` : 'Free'}</div>
              <div className="text-xs text-gray-400 mt-1">{it.creator}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
