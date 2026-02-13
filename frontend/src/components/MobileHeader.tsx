import React, { useState } from 'react';
import { Menu, X, Home, LogOut } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

interface MobileHeaderProps {
  logo?: string;
  logoText?: string;
  onMenuToggle?: (isOpen: boolean) => void;
  onLogoClick?: () => void;
  userName?: string;
  onLogout?: () => void;
  isDesktop?: boolean;
}

/**
 * MobileHeader Component
 * Responsive header with hamburger menu, logo, and user menu
 */
export function MobileHeader({
  logo,
  logoText = 'Web3 Content',
  onMenuToggle,
  onLogoClick,
  userName,
  onLogout,
  isDesktop = false
}: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isMobile } = useResponsive();

  const handleMenuToggle = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    onMenuToggle?.(newState);
  };

  const handleLogoClick = () => {
    setIsMenuOpen(false);
    onLogoClick?.();
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Hamburger Menu - Mobile Only */}
        {isMobile && !isDesktop && (
          <button
            onClick={handleMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X size={24} className="text-gray-700" />
            ) : (
              <Menu size={24} className="text-gray-700" />
            )}
          </button>
        )}

        {/* Logo */}
        <div className="flex-1 px-4">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {logo ? (
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <Home size={24} className="text-blue-600" />
            )}
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">
              {logoText}
            </span>
          </button>
        </div>

        {/* User Menu - Desktop Only */}
        {!isMobile && userName && (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900 hidden sm:inline">
                {userName}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-600">User Account</p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile User Avatar */}
        {isMobile && userName && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
