import React, { useState, useEffect } from 'react';
import { useSTXPrice } from '../hooks/useSTXPrice';

interface TickerItem {
  label: string;
  usd: number;
}

interface PriceTickerProps {
  items?: number[];
  showAnimation?: boolean;
}

/**
 * Price Ticker Component
 * Shows multiple price conversions with animations
 * Great for hero sections or price highlights
 */
export const PriceTicker: React.FC<PriceTickerProps> = ({
  items = [1, 5, 10, 50, 100],
  showAnimation = true
}) => {
  const { current, isLoading } = useSTXPrice(30000);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [animationIndex, setAnimationIndex] = useState(0);

  // Calculate ticker items
  useEffect(() => {
    if (current) {
      const calculated = items.map((stxAmount) => ({
        label: `${stxAmount} STX`,
        usd: stxAmount * current
      }));
      setTickerItems(calculated);
    }
  }, [current, items]);

  // Animate through items
  useEffect(() => {
    if (!showAnimation || tickerItems.length === 0) return;

    const interval = setInterval(() => {
      setAnimationIndex((prev) => (prev + 1) % tickerItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [tickerItems, showAnimation]);

  if (isLoading || tickerItems.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-300 rounded w-48"></div>
      </div>
    );
  }

  if (showAnimation && tickerItems.length > 0) {
    const current = tickerItems[animationIndex];
    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white text-center">
        <div className="text-sm font-semibold text-blue-200 mb-2">Current Conversion</div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-3xl font-bold">{current.label}</span>
          <span className="text-2xl">=</span>
          <span className="text-3xl font-bold text-green-300">${current.usd.toFixed(2)}</span>
        </div>
        {/* Dots for navigation */}
        <div className="flex gap-2 justify-center mt-4">
          {tickerItems.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === animationIndex ? 'bg-white w-6' : 'bg-blue-400 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Static display
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Price Reference</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickerItems.map((item, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-xl font-bold text-blue-600">${item.usd.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceTicker;
