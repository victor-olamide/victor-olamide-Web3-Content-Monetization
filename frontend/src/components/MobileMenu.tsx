import React, { useEffect } from 'react';
import { X, Home, Compass, ShoppingCart, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path: string;
  badge?: number;
  isDanger?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  userName?: string;
}

/**
 * MobileMenu Component
 * Slide-out sidebar navigation menu for mobile devices
 */
export function MobileMenu({
  isOpen,
  onClose,
  navItems,
  currentPath = '/',
  onNavigate,
  onLogout,
  userName
}: MobileMenuProps) {
  const { isMobile } = useResponsive();

  // Close menu on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent scroll on body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleNavClick = (path: string) => {
    onNavigate?.(path);
    onClose();
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 md:hidden overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>

        {/* User Info */}
        {userName && (
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-600">Active User</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="py-4">
          {navItems.map((item, index) => (
            <div key={item.id}>
              {/* Divider before certain items */}
              {(index === 3 || index === 5) && (
                <div className="my-2 border-t border-gray-200" />
              )}

              <button
                onClick={() => handleNavClick(item.path)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                  currentPath === item.path
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${item.isDanger ? 'text-red-600 hover:bg-red-50' : ''}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1 text-left font-medium text-sm">
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    size={18}
                    className={
                      currentPath === item.path ? 'text-blue-600' : 'text-gray-400'
                    }
                  />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        {onLogout && (
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="px-4 py-4 border-t border-gray-200 mt-auto">
          <p className="text-xs text-gray-600 text-center">
            Web3 Content Monetization v1.0
          </p>
        </div>
      </nav>
    </>
  );
}
