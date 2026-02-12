import React, { useState, useEffect } from 'react';
import { filterApi, Category } from '../utils/filterApi';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  disabled?: boolean;
}

/**
 * CategoryFilter Component
 * Displays available categories with counts and allows selection
 */
export function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
  disabled = false
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await filterApi.getCategories();
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((c) => c !== categoryId)
      : [...selectedCategories, categoryId];
    
    onCategoriesChange(newCategories);
  };

  // Handle select all
  const handleSelectAll = () => {
    const allCategoryIds = categories.map((c) => c.id);
    onCategoriesChange(
      selectedCategories.length === categories.length ? [] : allCategoryIds
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Categories</h3>
        {error && <span className="text-red-500 text-xs">{error}</span>}
      </div>

      {categories.length > 0 && (
        <div className="mb-4 pb-4 border-b">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCategories.length === categories.length}
              onChange={handleSelectAll}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="ml-3 font-medium text-sm">Select All</span>
          </label>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.id)}
              onChange={() => handleCategoryChange(category.id)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="ml-3 flex-1 text-sm font-medium capitalize">
              {category.name}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {category.count}
            </span>
          </label>
        ))}
      </div>

      {categories.length === 0 && !error && (
        <p className="text-gray-500 text-sm">No categories available</p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
