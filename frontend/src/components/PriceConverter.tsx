import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, AlertCircle, Loader } from 'lucide-react';
import { usePriceConversion } from '../hooks/usePriceConversion';

type ConversionType = 'stx-to-usd' | 'usd-to-stx';

/**
 * Price Converter Component
 * Convert between STX and USD amounts in real-time
 */
export const PriceConverter: React.FC = () => {
  const [conversionType, setConversionType] = useState<ConversionType>('stx-to-usd');
  const [inputAmount, setInputAmount] = useState<string>('1');
  const [outputAmount, setOutputAmount] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const { result, isLoading, error, convertSTXtoUSD, convertUSDtoSTX } =
    usePriceConversion();

  // Perform conversion when input changes
  useEffect(() => {
    const amount = parseFloat(inputAmount);

    if (isNaN(amount) || amount < 0) {
      setOutputAmount(null);
      setExchangeRate(null);
      return;
    }

    const performConversion = async () => {
      try {
        if (conversionType === 'stx-to-usd') {
          const res = await convertSTXtoUSD(amount);
          setOutputAmount(res.usd.toFixed(4));
          setExchangeRate(res.rate);
        } else {
          const res = await convertUSDtoSTX(amount);
          setOutputAmount(res.stx.toFixed(4));
          setExchangeRate(res.rate);
        }
      } catch (err) {
        // Error already handled by hook
      }
    };

    // Debounce conversion
    const timeout = setTimeout(performConversion, 300);
    return () => clearTimeout(timeout);
  }, [inputAmount, conversionType, convertSTXtoUSD, convertUSDtoSTX]);

  const handleSwap = () => {
    setConversionType(conversionType === 'stx-to-usd' ? 'usd-to-stx' : 'stx-to-usd');
    // Optionally swap input/output
    if (outputAmount) {
      setInputAmount(outputAmount);
      setOutputAmount(null);
    }
  };

  const sourceLabel = conversionType === 'stx-to-usd' ? 'STX' : 'USD';
  const targetLabel = conversionType === 'stx-to-usd' ? 'USD' : 'STX';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Price Converter</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From ({sourceLabel})
        </label>
        <div className="relative">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute right-4 top-3 text-gray-600 font-semibold">{sourceLabel}</span>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleSwap}
          className="p-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
          title="Swap currencies"
        >
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
        </button>
      </div>

      {/* Output Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To ({targetLabel})
        </label>
        <div className="relative">
          {isLoading ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
              <Loader className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-gray-500">Converting...</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={outputAmount || ''}
                readOnly
                placeholder="Result will appear here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <span className="absolute right-4 top-3 text-gray-600 font-semibold">{targetLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Exchange Rate */}
      {exchangeRate && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Exchange Rate:</span> 1{' '}
            <span className="font-mono">{sourceLabel}</span> = <span className="font-mono">{exchangeRate.toFixed(4)}</span>{' '}
            <span className="font-mono">{targetLabel}</span>
          </p>
        </div>
      )}

      {/* Quick Convert Buttons */}
      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Quick Convert</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 5, 10, 25, 50, 100].map((amount) => (
            <button
              key={amount}
              onClick={() => setInputAmount(amount.toString())}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              {amount} {sourceLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceConverter;
