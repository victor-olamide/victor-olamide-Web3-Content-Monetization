import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
  maxItems?: number;
  showHome?: boolean;
}

/**
 * Breadcrumb Component
 * Mobile-friendly breadcrumb navigation with collapsible items
 */
export function Breadcrumb({
  items,
  onNavigate,
  maxItems = 3,
  showHome = true
}: BreadcrumbProps) {
  const { isMobile } = useResponsive();
  const [showAll, setShowAll] = React.useState(false);

  // Add home item if requested
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', path: '/' }, ...items]
    : items;

  // Determine which items to show
  let visibleItems = allItems;
  let hasEllipsis = false;

  if (!showAll && allItems.length > maxItems) {
    hasEllipsis = true;
    visibleItems = [
      allItems[0],
      ...allItems.slice(-(maxItems - 1))
    ];
  }

  return (
    <nav className="px-4 py-3 bg-white border-b border-gray-200" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 flex-wrap">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {/* Separator */}
              {!isFirst && (
                <ChevronRight
                  size={isMobile ? 16 : 20}
                  className="text-gray-400 flex-shrink-0"
                />
              )}

              {/* Item */}
              {item.path && !isLast ? (
                <button
                  onClick={() => onNavigate?.(item.path!)}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm md:text-base whitespace-nowrap"
                >
                  {isFirst && isMobile ? <Home size={16} /> : item.label}
                </button>
              ) : (
                <span className={`text-sm md:text-base whitespace-nowrap ${
                  isLast
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600'
                }`}>
                  {isFirst && isMobile ? <Home size={16} /> : item.label}
                </span>
              )}
            </li>
          );
        })}

        {/* Ellipsis for hidden items */}
        {hasEllipsis && !showAll && allItems.length > maxItems && (
          <li className="flex items-center gap-1">
            <ChevronRight size={isMobile ? 16 : 20} className="text-gray-400" />
            <button
              onClick={() => setShowAll(true)}
              className="text-blue-600 hover:text-blue-800 text-sm md:text-base font-medium"
            >
              ...
            </button>
          </li>
        )}

        {/* Collapse button when showing all */}
        {showAll && allItems.length > maxItems && (
          <li className="ml-auto">
            <button
              onClick={() => setShowAll(false)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Collapse
            </button>
          </li>
        )}
      </ol>

      {/* Full path when expanded */}
      {showAll && allItems.length > maxItems && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
          <p className="font-medium mb-1">Full path:</p>
          <div className="space-y-1">
            {allItems.map((item, index) => (
              <div key={`full-${index}`} className="flex items-center gap-2">
                <span className="text-gray-400">{'→'}</span>
                {item.path && !item.isActive ? (
                  <button
                    onClick={() => {
                      onNavigate?.(item.path!);
                      setShowAll(false);
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span>{item.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
