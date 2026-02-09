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
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const ContentList: React.FC = () => {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content`);
        const data = await response.json();
        setContentItems(data);
      } catch (err) {
        console.error("Failed to fetch content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading) return <div>Loading content...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
      <h3 className="text-lg font-bold mb-4">Your Content</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contentItems.map((item) => (
              <tr key={item.contentId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contentType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price} STX</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.purchases || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <Link href={`/content/${item.contentId}`} className="text-blue-600 hover:text-blue-900">View</Link>
                  <button className="text-orange-600 hover:text-orange-900">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentList;
