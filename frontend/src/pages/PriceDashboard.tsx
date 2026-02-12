import React from 'react';
import { PriceDisplay } from './PriceDisplay';
import { PriceConverter } from './PriceConverter';
import { PriceTicker } from './PriceTicker';
import { PriceWidget } from './PriceWidget';
import { ContentPriceDisplay } from './ContentPriceDisplay';

/**
 * Price Dashboard Page
 * Complete dashboard showing real-time STX pricing
 * Includes multiple components for different use cases
 */
export const PriceDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900">STX Price Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time STX/USD price data and conversion tools
          </p>
        </div>

        {/* Top Row: Price Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Price Display */}
          <div className="lg:col-span-2">
            <PriceDisplay />
          </div>

          {/* Widget Version */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-center items-center">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Compact Widget</h3>
            <PriceWidget compact={false} />
          </div>
        </div>

        {/* Price Ticker */}
        <div className="mb-6">
          <PriceTicker showAnimation={true} />
        </div>

        {/* Middle Row: Converter and Content Price */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PriceConverter />
          <ContentPriceDisplay
            stxPrice={10}
            contentTitle="Premium Content"
            showConversion={true}
            compact={false}
          />
        </div>

        {/* Additional Content Examples */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Pricing Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Basic Article', price: 2.5 },
              { title: 'Premium Guide', price: 5.0 },
              { title: 'Exclusive Content', price: 10.0 }
            ].map((item, index) => (
              <ContentPriceDisplay
                key={index}
                stxPrice={item.price}
                contentTitle={item.title}
                showConversion={true}
                compact={true}
              />
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Real-time Updates */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Real-time Updates</h3>
            <p className="text-blue-800 text-sm">
              Price data is updated every 30 seconds with automatic refresh for the most accurate conversions.
            </p>
          </div>

          {/* Accurate Conversions */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Accurate Conversions</h3>
            <p className="text-green-800 text-sm">
              All conversions use current market rates from CoinGecko API with sub-second calculation.
            </p>
          </div>

          {/* Cached Performance */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Cached Performance</h3>
            <p className="text-purple-800 text-sm">
              Smart caching strategy minimizes API calls while ensuring you always have fresh data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceDashboard;
