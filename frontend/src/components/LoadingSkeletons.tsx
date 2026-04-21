'use client';

import React from 'react';

/**
 * Loading skeleton for cards
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </>
  );
}

/**
 * Loading skeleton for table rows
 */
export function TableRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <tr key={index} className="border-b animate-pulse">
          {[...Array(4)].map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Loading skeleton for page content
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-1/3 mb-8"></div>
      <div className="h-6 bg-gray-200 rounded w-2/3 mb-6"></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-gray-200 rounded-lg h-32"></div>
        ))}
      </div>

      <div className="bg-gray-200 rounded-lg h-64"></div>
    </div>
  );
}

/**
 * Loading skeleton for form
 */
export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(5)].map((_, index) => (
        <div key={index}>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
  );
}

/**
 * Loading shimmer effect
 */
export function ShimmerLoader() {
  return (
    <div className="relative overflow-hidden">
      <div className="animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-full">
        <div
          className="absolute top-0 left-0 bottom-0 right-0 translate-x-full animate-shimmer"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer 2s infinite'
          }}
        ></div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Full-page loading spinner
 */
export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-4"></div>
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function InlineLoader() {
  return (
    <div className="inline-block animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
  );
}

/**
 * Loading skeleton for profile
 */
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="bg-gradient-to-r from-gray-200 to-gray-100 h-32"></div>
      <div className="px-6 pb-6">
        <div className="flex gap-6 mb-8 -mt-12">
          <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index}>
              <div className="h-4 bg-gray-200 rounded w-1/6 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
