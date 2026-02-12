import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useSTXPrice } from '../hooks/useSTXPrice';

/**
 * Real-time STX Price Display Component
 * Shows current STX/USD price with 24h change
 */
export const PriceDisplay: React.FC = () => {
  const { current, formatted, change_24h, change_24h_percent, isLoading, error, refetch } =
    useSTXPrice(30000); // Refresh every 30 seconds
  const [showDetails, setShowDetails] = useState(false);

  const isPositiveChange = change_24h && change_24h > 0;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-center">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-red-700 font-medium">Price unavailable</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
        <button
          onClick={refetch}
          className="ml-2 p-2 hover:bg-red-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">STX Price</h2>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-2 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh price"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Price Display */}
      <div className="mb-4">
        {isLoading && !current ? (
          <div className="animate-pulse">
            <div className="h-10 bg-blue-500 rounded w-32 mb-2"></div>
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold">{formatted}</p>
          </>
        )}
      </div>

      {/* 24h Change */}
      {!isLoading && current && change_24h !== null && change_24h_percent && (
        <div className="flex items-center gap-2 mb-3">
          {isPositiveChange ? (
            <TrendingUp className="w-5 h-5 text-green-300" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-300" />
          )}
          <span
            className={`font-semibold ${
              isPositiveChange ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {isPositiveChange ? '+' : ''}
            {change_24h.toFixed(4)} USD ({change_24h_percent})
          </span>
        </div>
      )}

      {/* Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg font-medium transition-colors"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {/* Details Section */}
      {showDetails && !isLoading && (
        <div className="mt-4 pt-4 border-t border-blue-500 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-200">24h Change:</span>
            <span className="font-semibold">
              {isPositiveChange ? '+' : ''}
              {change_24h?.toFixed(4)} USD
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-200">24h Change %:</span>
            <span className={`font-semibold ${isPositiveChange ? 'text-green-300' : 'text-red-300'}`}>
              {change_24h_percent}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-200">Last Updated:</span>
            <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceDisplay;
