'use client';

import React from 'react';
import { Share2, Download, Flag, Calendar, Eye, Clock } from 'lucide-react';
import type { Content } from '@/types/content';

interface ContentMetadataProps {
  content: Content;
  viewCount?: number;
  createdDate?: string;
  duration?: string;
  onShare: () => void;
  onDownload: () => void;
  onReport: () => void;
}

export const ContentMetadata: React.FC<ContentMetadataProps> = ({
  content,
  viewCount = 0,
  createdDate,
  duration,
  onShare,
  onDownload,
  onReport,
}) => {
  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Content Title and Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase tracking-wider">
            {content.type}
          </span>
          {duration && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase tracking-wider">
              {duration}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-gray-900">{content.title}</h1>
        {content.description && (
          <p className="text-lg text-gray-600 mt-4">{content.description}</p>
        )}
      </div>

      {/* Creator Info */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Creator</p>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
            {content.creator?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{content.creator}</p>
            <p className="text-xs text-gray-500 font-mono truncate">{content.creator}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Eye size={14} />
            Views
          </p>
          <p className="text-2xl font-bold text-gray-900">{viewCount.toLocaleString()}</p>
        </div>

        {createdDate && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Calendar size={14} />
              Published
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(createdDate)}
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Clock size={14} />
            Duration
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {duration || 'N/A'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Price</p>
          <p className="text-2xl font-bold text-orange-600">{content.price} STX</p>
        </div>
      </div>

      {/* Content Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Tags</p>
          <div className="flex flex-wrap gap-2">
            {content.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content Categories */}
      {content.category && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Category</p>
          <span className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-medium">
            {content.category}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
          aria-label="Share content"
        >
          <Share2 size={18} />
          Share
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
          aria-label="Download content"
        >
          <Download size={18} />
          Download
        </button>
        <button
          onClick={onReport}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition font-medium"
          aria-label="Report content"
        >
          <Flag size={18} />
          Report
        </button>
      </div>

      {/* Content License/Terms */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm text-gray-600">
        <p>
          By purchasing this content, you agree to the creator's terms of service and
          license agreement. Content is for personal use only.
        </p>
      </div>
    </div>
  );
};

export default ContentMetadata;
