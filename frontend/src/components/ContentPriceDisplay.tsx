import React, { useState, useEffect } from 'react';
import { usePriceConversion } from '../hooks/usePriceConversion';
import { AlertCircle, Loader } from 'lucide-react';

interface ContentPriceDisplayProps {
  stxPrice: number;
  contentTitle?: string;
  showConversion?: boolean;
  compact?: boolean;
}

/**
 * Content Price Display Component
 * Shows content price in both STX and USD
 * Useful for product listings and checkout pages
 */
export const ContentPriceDisplay: React.FC<ContentPriceDisplayProps> = ({
  stxPrice,
  contentTitle = 'Content',
  showConversion = true,
  compact = false
}) => {
  const { result, isLoading, error } = usePriceConversion();
  const [usdPrice, setUsdPrice] = useState<number | null>(null);

  // Convert STX to USD on mount
  useEffect(() => {
    const performConversion = async () => {
      try {
        const response = await fetch('/api/prices/convert/stx-to-usd', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount: stxPrice })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUsdPrice(data.data.usd);
          }
        }
      } catch (err) {
        console.error('Failed to convert price:', err);
      }
    };

    if (showConversion) {
      performConversion();
    }
  }, [stxPrice, showConversion]);

  if (compact) {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{stxPrice.toFixed(2)} STX</div>
        {usdPrice && showConversion && (
          <div className="text-sm text-gray-600">${usdPrice.toFixed(2)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</h3>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* STX Price */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex justify-between items-baseline">
          <span className="text-gray-600 font-medium">STX Price</span>
          <span className="text-3xl font-bold text-blue-600">{stxPrice.toFixed(2)} STX</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{contentTitle}</p>
      </div>

      {/* USD Conversion */}
      {showConversion && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">USD Price</span>
            {isLoading && usdPrice === null ? (
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-500">Converting...</span>
              </div>
            ) : usdPrice ? (
              <span className="text-3xl font-bold text-green-600">${usdPrice.toFixed(2)}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      )}

      {/* Conversion Info */}
      {usdPrice && showConversion && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <p className="text-gray-700">
            <span className="font-semibold">1 STX</span> = <span className="font-mono">${(usdPrice / stxPrice).toFixed(4)}</span> USD
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Price updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentPriceDisplay;
