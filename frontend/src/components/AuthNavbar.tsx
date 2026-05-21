'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { Menu, X, LogOut, User, Settings } from 'lucide-react';

export function AuthNavbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useJWTAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">
              Content Monetization
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link href="/content" className="text-gray-700 hover:text-blue-600 font-medium">
              Content
            </Link>
            <Link href="/analytics" className="text-gray-700 hover:text-blue-600 font-medium">
              Analytics
            </Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <div className="border-t my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Dashboard
            </Link>
            <Link
              href="/content"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Content
            </Link>
            <Link
              href="/analytics"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Analytics
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
