'use client';

import React from 'react';
import ConnectWallet from './ConnectWallet';
import Link from 'next/link';

/**
 * Layout wrapper for the dashboard pages including sidebar and header
 */
const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-orange-600">StacksMonetize</Link>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
            Overview
          </Link>
          <Link href="#" className="block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">
            My Content
          </Link>
          <Link href="#" className="block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">
            Subscriptions
          </Link>
          <Link href="#" className="block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="md:hidden text-xl font-bold text-orange-600">StacksMonetize</div>
          <div className="ml-auto flex items-center gap-4">
            <ConnectWallet />
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
