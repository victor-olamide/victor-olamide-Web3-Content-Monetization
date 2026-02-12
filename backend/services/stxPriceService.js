/**
 * STX Price Service
 * Manages real-time STX/USD price fetching and caching
 */

const axios = require('axios');

// Cache configuration
const CACHE = {
  price: null,
  timestamp: null,
  TTL: 60000 // 1 minute cache
};

/**
 * Fetch current STX price from CoinGecko API
 * Uses free API with no authentication required
 * Caches results to minimize API calls
 */
async function getCurrentSTXPrice() {
  try {
    // Check if cache is still valid
    if (CACHE.price && CACHE.timestamp) {
      const age = Date.now() - CACHE.timestamp;
      if (age < CACHE.TTL) {
        return CACHE.price;
      }
    }

    // Fetch from CoinGecko API
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'stacks',
          vs_currencies: 'usd',
          include_market_cap: 'false',
          include_24hr_vol: 'true',
          include_24hr_change: 'true',
          include_last_updated_at: 'true'
        },
        timeout: 5000
      }
    );

    if (!response.data || !response.data.stacks || !response.data.stacks.usd) {
      throw new Error('Invalid API response format');
    }

    // Extract and format price data
    const priceData = {
      usd: response.data.stacks.usd,
      usd_24h_vol: response.data.stacks.usd_24h_vol || 0,
      usd_24h_change: response.data.stacks.usd_24h_change || 0,
      last_updated_at: response.data.stacks.last_updated_at || Date.now() / 1000
    };

    // Update cache
    CACHE.price = priceData;
    CACHE.timestamp = Date.now();

    return priceData;
  } catch (error) {
    console.error('Error fetching STX price:', error.message);

    // If cache exists, return stale data
    if (CACHE.price) {
      console.warn('Returning cached STX price due to API error');
      return CACHE.price;
    }

    // Fallback price if no cache available
    throw new Error(`Failed to fetch STX price: ${error.message}`);
  }
}

/**
 * Convert STX amount to USD
 * Fetches current price if necessary
 */
async function convertSTXtoUSD(stxAmount) {
  try {
    const priceData = await getCurrentSTXPrice();
    return {
      stx: stxAmount,
      usd: stxAmount * priceData.usd,
      rate: priceData.usd,
      timestamp: CACHE.timestamp
    };
  } catch (error) {
    throw new Error(`Failed to convert STX to USD: ${error.message}`);
  }
}

/**
 * Convert USD amount to STX
 * Fetches current price if necessary
 */
async function convertUSDtoSTX(usdAmount) {
  try {
    const priceData = await getCurrentSTXPrice();
    if (priceData.usd === 0) {
      throw new Error('Invalid STX price: division by zero');
    }

    return {
      usd: usdAmount,
      stx: usdAmount / priceData.usd,
      rate: priceData.usd,
      timestamp: CACHE.timestamp
    };
  } catch (error) {
    throw new Error(`Failed to convert USD to STX: ${error.message}`);
  }
}

/**
 * Get price data with formatted information
 * Includes 24h change percentage and volume
 */
async function getPriceData() {
  try {
    const priceData = await getCurrentSTXPrice();

    return {
      current: priceData.usd,
      volume_24h: priceData.usd_24h_vol,
      change_24h: priceData.usd_24h_change,
      change_24h_percent: (
        (priceData.usd_24h_change / (priceData.usd - priceData.usd_24h_change)) *
        100
      ).toFixed(2),
      last_updated: new Date(priceData.last_updated_at * 1000).toISOString(),
      cache_age_ms: Date.now() - CACHE.timestamp
    };
  } catch (error) {
    throw new Error(`Failed to get price data: ${error.message}`);
  }
}

/**
 * Clear the price cache
 * Used for testing or manual refresh
 */
function clearCache() {
  CACHE.price = null;
  CACHE.timestamp = null;
}

/**
 * Set cache TTL (Time To Live) in milliseconds
 * Useful for testing or custom cache strategies
 */
function setCacheTTL(ttlMs) {
  if (ttlMs < 0) {
    throw new Error('Cache TTL must be non-negative');
  }
  CACHE.TTL = ttlMs;
}

/**
 * Get current cache status
 * Returns age and validity information
 */
function getCacheStatus() {
  if (!CACHE.price || !CACHE.timestamp) {
    return {
      isCached: false,
      age_ms: null,
      valid: false
    };
  }

  const age = Date.now() - CACHE.timestamp;
  return {
    isCached: true,
    age_ms: age,
    valid: age < CACHE.TTL,
    ttl_ms: CACHE.TTL
  };
}

/**
 * Batch convert multiple STX amounts
 * More efficient than individual calls
 */
async function convertMultipleSTXtoUSD(amounts) {
  try {
    const priceData = await getCurrentSTXPrice();
    const rate = priceData.usd;

    return amounts.map((stxAmount) => ({
      stx: stxAmount,
      usd: stxAmount * rate,
      rate: rate
    }));
  } catch (error) {
    throw new Error(`Failed to batch convert STX to USD: ${error.message}`);
  }
}

/**
 * Get formatted price string for display
 * Rounds to 2 decimal places
 */
async function getFormattedPrice() {
  try {
    const priceData = await getCurrentSTXPrice();
    return {
      usd: `$${priceData.usd.toFixed(2)}`,
      change_24h: priceData.usd_24h_change.toFixed(4),
      change_percent: (
        (priceData.usd_24h_change / (priceData.usd - priceData.usd_24h_change)) *
        100
      ).toFixed(2) + '%'
    };
  } catch (error) {
    throw new Error(`Failed to format price: ${error.message}`);
  }
}

module.exports = {
  getCurrentSTXPrice,
  convertSTXtoUSD,
  convertUSDtoSTX,
  getPriceData,
  clearCache,
  setCacheTTL,
  getCacheStatus,
  convertMultipleSTXtoUSD,
  getFormattedPrice
};
