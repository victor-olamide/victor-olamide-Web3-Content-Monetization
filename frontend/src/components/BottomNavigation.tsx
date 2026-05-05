import React from 'react';
import { Home, Compass, ShoppingCart, Bell, User } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface BottomNavigationProps {
  items: BottomNavItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  showLabels?: boolean;
}

/**
 * BottomNavigation Component
 * Fixed bottom navigation bar for mobile devices (Material Design style)
 */
export function BottomNavigation({
  items,
  currentPath = '/',
  onNavigate,
  showLabels = true
}: BottomNavigationProps) {
  const { isMobile, isTablet } = useResponsive();

  // Show only on mobile and tablet screens
  if (!isMobile && !isTablet) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-30">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = currentPath === item.path;
          const isBadged = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.path)}
              className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors relative flex-1 h-full ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={item.label}
            >
              {/* Icon */}
              <div className="relative">
                <span className={`text-2xl transition-all ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}>
                  {item.icon}
                </span>

                {/* Badge */}
                {isBadged && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <span className={`text-xs mt-1 font-medium line-clamp-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-1 w-8 bg-blue-600 rounded-t-lg" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Bottom Navigation Container
 * Wrapper that adds bottom padding to body content
 */
export function BottomNavigationContainer({
  children,
  hasBottomNav = true
}: {
  children: React.ReactNode;
  hasBottomNav?: boolean;
}) {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div className={`transition-all ${
      hasBottomNav && (isMobile || isTablet) ? 'pb-20' : ''
    }`}>
      {children}
    </div>
  );
}
