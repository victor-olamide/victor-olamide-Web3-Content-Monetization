import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useSTXPrice } from '../hooks/useSTXPrice';

interface PriceWidgetProps {
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Compact Price Widget Component
 * Lightweight display of current STX price
 * Perfect for headers, sidebars, or small spaces
 */
export const PriceWidget: React.FC<PriceWidgetProps> = ({
  compact = true,
  showDetails = true
}) => {
  const { current, formatted, change_24h, change_24h_percent, isLoading } =
    useSTXPrice(30000);

  const isPositiveChange = change_24h && change_24h > 0;

  if (isLoading || !current) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-24"></div>
      </div>
    );
  }

  return (
    <div className={compact ? 'text-center' : 'bg-blue-50 rounded-lg p-3'}>
      {/* Price */}
      <div className="flex items-center gap-2 justify-center">
        <span className={`font-bold ${compact ? 'text-lg' : 'text-xl'}`}>
          {formatted}
        </span>

        {/* Change Indicator */}
        {change_24h !== null && (
          <div className="flex items-center gap-1">
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-xs font-semibold ${
                isPositiveChange ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositiveChange ? '+' : ''}
              {change_24h.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* 24h Change Percentage */}
      {showDetails && change_24h_percent && (
        <p
          className={`text-xs ${
            isPositiveChange ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositiveChange ? '+' : ''}
          {change_24h_percent} (24h)
        </p>
      )}
    </div>
  );
};

export default PriceWidget;
