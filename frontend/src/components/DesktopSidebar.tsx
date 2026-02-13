/**
 * DesktopSidebar Component
 * Collapsible sidebar navigation for desktop layouts
 */

import React, { useState } from 'react';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  badge?: number;
  children?: NavItem[];
}

export interface DesktopSidebarProps {
  items: NavItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  width?: string;
  logoSection?: React.ReactNode;
  footerSection?: React.ReactNode;
  className?: string;
}

/**
 * DesktopSidebar Component
 * Provides collapsible sidebar navigation for desktop layouts
 * Features:
 * - Collapsible/expandable sidebar
 * - Active state highlighting
 * - Badge support
 * - Nested menu items
 * - Smooth animations
 * - Customizable width
 * - Logo and footer sections
 */
export const DesktopSidebar = React.forwardRef<HTMLDivElement, DesktopSidebarProps>(
  (
    {
      items,
      currentPath = '/',
      onNavigate,
      collapsible = true,
      defaultExpanded = true,
      width = 'w-64',
      logoSection,
      footerSection,
      className = ''
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpanded = () => {
      if (collapsible) {
        setIsExpanded(!isExpanded);
      }
    };

    const toggleItemExpanded = (itemId: string) => {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedItems(newExpanded);
    };

    const handleNavigate = (path?: string) => {
      if (path && onNavigate) {
        onNavigate(path);
      }
    };

    const renderNavItem = (item: NavItem, depth = 0) => {
      const isActive = currentPath === item.path;
      const isItemExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id} className={depth > 0 ? 'pl-2' : ''}>
          {/* Main Item */}
          <button
            onClick={() => {
              if (hasChildren) {
                toggleItemExpanded(item.id);
              } else {
                handleNavigate(item.path);
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            } ${!isExpanded && 'px-2 justify-center'}`}
            title={!isExpanded ? item.label : ''}
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.icon && (
                <div className={`flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                  {item.icon}
                </div>
              )}
              {isExpanded && (
                <span className="truncate text-sm font-medium">{item.label}</span>
              )}
            </div>

            {/* Badge and Expand Indicator */}
            {isExpanded && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {hasChildren && (
                  <ChevronRight
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${
                      isItemExpanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </div>
            )}
          </button>

          {/* Nested Items */}
          {hasChildren && isItemExpanded && isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isExpanded ? width : 'w-20'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isExpanded && logoSection && <div className="flex-1">{logoSection}</div>}
          {!isExpanded && logoSection && (
            <div className="flex items-center justify-center w-full">{logoSection}</div>
          )}

          {/* Collapse Button */}
          {collapsible && (
            <button
              onClick={toggleExpanded}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {items.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer Section */}
        {footerSection && (
          <div className="border-t border-gray-200 p-4">
            {isExpanded ? footerSection : null}
          </div>
        )}
      </div>
    );
  }
);

DesktopSidebar.displayName = 'DesktopSidebar';

/**
 * SidebarMainLayout Component
 * Wrapper component that combines sidebar with main content area
 */
export interface SidebarMainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SidebarMainLayout: React.FC<SidebarMainLayoutProps> = ({
  sidebar,
  children,
  className = ''
}) => {
  return (
    <div className={`flex h-screen overflow-hidden ${className}`}>
      {/* Sidebar */}
      <div className="flex-shrink-0">{sidebar}</div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

/**
 * SidebarToggle Component
 * Button to toggle sidebar visibility in responsive layouts
 */
export interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isOpen,
  onToggle,
  className = ''
}) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors ${className}`}
      title={isOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
};

/**
 * SidebarItem Component
 * Individual sidebar navigation item
 */
export interface SidebarItemProps {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
  collapsed?: boolean;
  className?: string;
}

export const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  (
    { label, icon, isActive = false, badge, onClick, collapsed = false, className = '' },
    ref
  ) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`
          w-full flex items-center justify-between px-4 py-2 rounded-lg
          transition-all duration-200 text-sm font-medium
          ${
            isActive
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }
          ${collapsed ? 'px-2 justify-center' : ''}
          ${className}
        `}
        title={collapsed ? label : ''}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          {!collapsed && <span className="truncate">{label}</span>}
        </div>

        {!collapsed && badge !== undefined && badge > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex-shrink-0">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);

SidebarItem.displayName = 'SidebarItem';
