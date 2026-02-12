import { useState, useCallback } from 'react';

export interface ConversionResult {
  stx?: number;
  usd?: number;
  rate: number;
  timestamp: number;
}

export interface ConversionState {
  result: ConversionResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * usePriceConversion Hook
 * Manages STX <-> USD price conversions
 * 
 * Usage:
 * const { convertSTXtoUSD, convertUSDtoSTX } = usePriceConversion();
 * const result = await convertSTXtoUSD(10.5);
 */
export const usePriceConversion = () => {
  const [conversionState, setConversionState] = useState<ConversionState>({
    result: null,
    isLoading: false,
    error: null
  });

  /**
   * Convert STX amount to USD
   */
  const convertSTXtoUSD = useCallback(async (amount: number) => {
    try {
      setConversionState({ result: null, isLoading: true, error: null });

      if (amount < 0) {
        throw new Error('Amount must be non-negative');
      }

      const response = await fetch('/api/prices/convert/stx-to-usd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Conversion failed');
      }

      const data = await response.json();

      if (data.success) {
        setConversionState({
          result: data.data,
          isLoading: false,
          error: null
        });
        return data.data;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Conversion failed';
      setConversionState({
        result: null,
        isLoading: false,
        error: errorMsg
      });
      throw err;
    }
  }, []);

  /**
   * Convert USD amount to STX
   */
  const convertUSDtoSTX = useCallback(async (amount: number) => {
    try {
      setConversionState({ result: null, isLoading: true, error: null });

      if (amount < 0) {
        throw new Error('Amount must be non-negative');
      }

      const response = await fetch('/api/prices/convert/usd-to-stx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Conversion failed');
      }

      const data = await response.json();

      if (data.success) {
        setConversionState({
          result: data.data,
          isLoading: false,
          error: null
        });
        return data.data;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Conversion failed';
      setConversionState({
        result: null,
        isLoading: false,
        error: errorMsg
      });
      throw err;
    }
  }, []);

  /**
   * Batch convert multiple STX amounts
   */
  const batchConvertSTXtoUSD = useCallback(async (amounts: number[]) => {
    try {
      setConversionState({ result: null, isLoading: true, error: null });

      if (!Array.isArray(amounts)) {
        throw new Error('Amounts must be an array');
      }

      if (amounts.length === 0) {
        throw new Error('Amounts array cannot be empty');
      }

      if (amounts.length > 1000) {
        throw new Error('Maximum 1000 amounts per request');
      }

      // Validate all amounts
      amounts.forEach((amt) => {
        if (typeof amt !== 'number' || amt < 0) {
          throw new Error(`Invalid amount: ${amt}`);
        }
      });

      const response = await fetch('/api/prices/convert/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amounts })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Batch conversion failed');
      }

      const data = await response.json();

      if (data.success) {
        setConversionState({
          result: {
            stx: 0,
            usd: amounts.reduce((sum, amt) => sum + (amt * (data.data[0]?.rate || 0)), 0),
            rate: data.data[0]?.rate || 0,
            timestamp: Date.now()
          },
          isLoading: false,
          error: null
        });
        return data.data;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Batch conversion failed';
      setConversionState({
        result: null,
        isLoading: false,
        error: errorMsg
      });
      throw err;
    }
  }, []);

  return {
    ...conversionState,
    convertSTXtoUSD,
    convertUSDtoSTX,
    batchConvertSTXtoUSD
  };
};

export default usePriceConversion;
