import React, { useState, useEffect } from 'react';
import { filterApi, PriceRangeInfo } from '../utils/filterApi';

interface PriceRangeFilterProps {
  minPrice: number | null;
  maxPrice: number | null;
  onPriceRangeChange: (minPrice: number | null, maxPrice: number | null) => void;
  disabled?: boolean;
}

/**
 * PriceRangeFilter Component
 * Displays price range options with distribution and allows custom range selection
 */
export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onPriceRangeChange,
  disabled = false
}: PriceRangeFilterProps) {
  const [priceInfo, setPriceInfo] = useState<PriceRangeInfo | null>(null);
  const [customMin, setCustomMin] = useState<string>(
    minPrice !== null ? minPrice.toString() : ''
  );
  const [customMax, setCustomMax] = useState<string>(
    maxPrice !== null ? maxPrice.toString() : ''
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Load price range info on mount
  useEffect(() => {
    const loadPriceRange = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await filterApi.getPriceRangeInfo();
        setPriceInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load price range');
      } finally {
        setIsLoading(false);
      }
    };

    loadPriceRange();
  }, []);

  // Handle preset range selection
  const handlePresetRange = (min: number, max: number) => {
    setCustomMin('');
    setCustomMax('');
    onPriceRangeChange(min, max);
  };

  // Handle custom range input
  const handleCustomRangeChange = () => {
    const min = customMin ? parseFloat(customMin) : null;
    const max = customMax ? parseFloat(customMax) : null;

    if (min !== null && max !== null && min > max) {
      setError('Minimum price cannot be greater than maximum price');
      return;
    }

    setError(null);
    onPriceRangeChange(min, max);
  };

  // Clear price filter
  const handleClearPrice = () => {
    setCustomMin('');
    setCustomMax('');
    setShowCustomRange(false);
    onPriceRangeChange(null, null);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Price Range</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!priceInfo) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Price Range</h3>
        <p className="text-gray-500 text-sm">No price data available</p>
      </div>
    );
  }

  const isFilterActive = minPrice !== null || maxPrice !== null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Price Range</h3>
        {isFilterActive && (
          <button
            onClick={handleClearPrice}
            disabled={disabled}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Price Info Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Min Price:</span>
          <span className="font-semibold">${priceInfo.minPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Max Price:</span>
          <span className="font-semibold">${priceInfo.maxPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg Price:</span>
          <span className="font-semibold">${priceInfo.avgPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Preset Ranges */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-semibold text-gray-700 uppercase">Preset Ranges</p>
        {priceInfo.ranges.map((range) => (
          <button
            key={`${range.min}-${range.max}`}
            onClick={() => handlePresetRange(range.min, range.max)}
            disabled={disabled}
            className={`w-full text-left p-2 rounded text-sm transition-colors ${
              minPrice === range.min && maxPrice === range.max
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{range.label}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {range.count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom Range Toggle */}
      <div className="mb-4 pb-4 border-t">
        <button
          onClick={() => setShowCustomRange(!showCustomRange)}
          disabled={disabled}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium py-2"
        >
          {showCustomRange ? 'Hide' : 'Show'} Custom Range
        </button>
      </div>

      {/* Custom Range Inputs */}
      {showCustomRange && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Minimum Price ($)
            </label>
            <input
              type="number"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              onBlur={handleCustomRangeChange}
              placeholder={`0.00`}
              min="0"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Maximum Price ($)
            </label>
            <input
              type="number"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              onBlur={handleCustomRangeChange}
              placeholder={`${priceInfo.maxPrice.toFixed(2)}`}
              min="0"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Current Selection */}
      {isFilterActive && !showCustomRange && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>Selected:</strong> ${minPrice?.toFixed(2) || '0.00'} - $
          {maxPrice?.toFixed(2) || 'any'}
        </div>
      )}
    </div>
  );
}
