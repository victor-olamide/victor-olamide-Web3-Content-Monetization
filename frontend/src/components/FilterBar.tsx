import React from 'react';
import { X } from 'lucide-react';

interface FilterBarProps {
  activeCategories: string[];
  minPrice: number | null;
  maxPrice: number | null;
  searchTerm: string;
  onRemoveCategory: (category: string) => void;
  onRemovePrice: () => void;
  onRemoveSearch: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

/**
 * FilterBar Component
 * Displays active filters and allows removal
 */
export function FilterBar({
  activeCategories,
  minPrice,
  maxPrice,
  searchTerm,
  onRemoveCategory,
  onRemovePrice,
  onRemoveSearch,
  onClearAll,
  disabled = false
}: FilterBarProps) {
  const hasActiveFilters =
    activeCategories.length > 0 ||
    minPrice !== null ||
    maxPrice !== null ||
    searchTerm.trim() !== '';

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Active Filters</h3>
        <button
          onClick={onClearAll}
          disabled={disabled}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Category Tags */}
        {activeCategories.map((category) => (
          <div
            key={category}
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            <span className="capitalize">{category}</span>
            <button
              onClick={() => onRemoveCategory(category)}
              disabled={disabled}
              className="text-blue-800 hover:text-blue-900 transition-colors disabled:opacity-50"
              title={`Remove ${category} filter`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Price Range Tag */}
        {(minPrice !== null || maxPrice !== null) && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <span>
              ${minPrice?.toFixed(2) || '0.00'} - $
              {maxPrice?.toFixed(2) || 'any'}
            </span>
            <button
              onClick={onRemovePrice}
              disabled={disabled}
              className="text-green-800 hover:text-green-900 transition-colors disabled:opacity-50"
              title="Remove price filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search Term Tag */}
        {searchTerm.trim() && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
            <span>"{searchTerm}"</span>
            <button
              onClick={onRemoveSearch}
              disabled={disabled}
              className="text-purple-800 hover:text-purple-900 transition-colors disabled:opacity-50"
              title="Remove search filter"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
