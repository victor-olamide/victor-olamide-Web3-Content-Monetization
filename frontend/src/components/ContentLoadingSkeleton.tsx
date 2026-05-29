'use client';

import React from 'react';

interface ContentLoadingSkeletonProps {
  showPlayer?: boolean;
  showMetadata?: boolean;
  fullPage?: boolean;
}

export const ContentLoadingSkeleton: React.FC<ContentLoadingSkeletonProps> = ({
  showPlayer = true,
  showMetadata = true,
  fullPage = false,
}) => {
  if (fullPage) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {showPlayer && (
              <div className="rounded-xl bg-gray-200 aspect-video animate-pulse" />
            )}

            {/* Metadata Section */}
            {showMetadata && (
              <div className="space-y-4">
                <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
              </div>
            )}

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-24 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-4">
            {/* Paywall Skeleton */}
            <div className="bg-gray-100 rounded-xl p-6 space-y-4">
              <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Related Content Skeleton */}
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded h-32 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showPlayer && (
        <div className="rounded-xl bg-gray-200 aspect-video animate-pulse" />
      )}

      {showMetadata && (
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
};

export const ContentPlayerSkeleton: React.FC = () => (
  <div className="rounded-xl bg-gray-200 aspect-video animate-pulse" />
);

export const PaywallSkeleton: React.FC = () => (
  <div className="bg-gray-100 rounded-xl p-8 space-y-4">
    <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
    <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
    <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
    <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
  </div>
);

export const RelatedContentSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="bg-gray-200 rounded aspect-video animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export default ContentLoadingSkeleton;
