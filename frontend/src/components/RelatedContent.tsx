'use client';

import React from 'react';
import Link from 'next/link';
import { PlayCircle, Lock } from 'lucide-react';
import type { Content } from '@/types/content';

interface RelatedContentProps {
  contentList: Content[];
  currentContentId: string;
  loading?: boolean;
  error?: string | null;
  maxItems?: number;
}

export const RelatedContent: React.FC<RelatedContentProps> = ({
  contentList,
  currentContentId,
  loading = false,
  error = null,
  maxItems = 6,
}) => {
  const filteredContent = contentList
    .filter((item) => item.id !== currentContentId)
    .slice(0, maxItems);

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
        Failed to load related content
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredContent.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No related content available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Related Content</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContent.map((content) => (
          <Link
            key={content.id}
            href={`/content/${content.id}`}
            className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-lg transition"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
              {content.thumbnail ? (
                <img
                  src={content.thumbnail}
                  alt={content.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <PlayCircle size={48} className="text-white/60" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <PlayCircle size={48} className="text-white opacity-0 group-hover:opacity-100 transition" />
              </div>

              {/* Lock Badge */}
              {content.price > 0 && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white p-1 rounded-full">
                  <Lock size={16} />
                </div>
              )}

              {/* Content Type Badge */}
              <div className="absolute bottom-2 left-2">
                <span className="inline-block bg-gray-900/70 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                  {content.type}
                </span>
              </div>
            </div>

            {/* Content Info */}
            <div className="p-3">
              <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-orange-600 transition">
                {content.title}
              </h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {content.creator}
              </p>

              {/* Price */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {content.price} STX
                </span>
                {content.viewCount !== undefined && (
                  <span className="text-xs text-gray-500">
                    {(content.viewCount / 1000).toFixed(1)}K views
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedContent;
