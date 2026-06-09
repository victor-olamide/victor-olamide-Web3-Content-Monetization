'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Stacks Content Monetization</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link href="/content" className="hover:text-blue-600 transition">
              Content
            </Link>
            <Link href="/analytics" className="hover:text-blue-600 transition">
              Analytics
            </Link>
            <Link href="/profile" className="hover:text-blue-600 transition">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
