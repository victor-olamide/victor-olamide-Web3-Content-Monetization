'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
        
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Access Denied
        </h1>
        
        <p className="text-gray-600 text-lg mb-8">
          You don't have permission to access this resource. If you think this is an error, please contact support.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Go Back
          </button>
          
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          <p className="text-sm text-gray-600">
            <strong>Error Code:</strong> 403 Forbidden
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If you believe you should have access, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
