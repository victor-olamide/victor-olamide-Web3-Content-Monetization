'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import WalletButton from '../WalletButton';
import { Menu, X, LogOut, User, Settings, Home, FileText, BarChart3 } from 'lucide-react';
import Logo from './Logo';
import UserMenu from './UserMenu';
import NavigationLinks from './NavigationLinks';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: jwtUser, isAuthenticated, logout: jwtLogout } = useJWTAuth();
  const { isLoggedIn, userData, logout: walletLogout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthorized = isAuthenticated || isLoggedIn;
  const displayName =
    jwtUser?.name ||
    userData?.profile?.name ||
    userData?.profile?.stxAddress?.mainnet ||
    userData?.profile?.stxAddress?.testnet ||
    'Creator';

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    if (isAuthenticated) {
      await jwtLogout();
    }
    if (isLoggedIn) {
      walletLogout();
    }
    router.push('/auth/login');
  };

  if (!isAuthorized) {
    return null;
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/content', label: 'Content', icon: FileText },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <NavigationLinks links={navLinks} className="hidden md:flex md:gap-8" />

          {/* Right section */}
          <div className="flex items-center gap-4">
            <WalletButton />

            {/* User Menu */}
            <UserMenu displayName={displayName} onLogout={handleLogout} />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t bg-white py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </Link>
            ))}
            <div className="border-t my-2 pt-2">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User size={18} />
                <span>Profile</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings size={18} />
                <span>Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-left"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
