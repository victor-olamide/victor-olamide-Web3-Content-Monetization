/**
 * Price API Utilities
 * Typed wrappers for all price-related API endpoints
 */

const API_BASE_URL = '/api/prices';

/**
 * Get current STX price with market data
 */
export async function getSTXPrice() {
  const response = await fetch(`${API_BASE_URL}/stx`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch STX price');
  }

  return response.json();
}

/**
 * Get formatted STX price ($X.XX format)
 */
export async function getFormattedSTXPrice() {
  const response = await fetch(`${API_BASE_URL}/stx/formatted`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch formatted price');
  }

  return response.json();
}

/**
 * Get raw STX price (just the number)
 */
export async function getRawSTXPrice() {
  const response = await fetch(`${API_BASE_URL}/stx/raw`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch raw price');
  }

  return response.json();
}

/**
 * Convert STX to USD
 */
export async function convertSTXtoUSD(amount: number) {
  const response = await fetch(`${API_BASE_URL}/convert/stx-to-usd`, {
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

  return response.json();
}

/**
 * Convert USD to STX
 */
export async function convertUSDtoSTX(amount: number) {
  const response = await fetch(`${API_BASE_URL}/convert/usd-to-stx`, {
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

  return response.json();
}

/**
 * Batch convert multiple STX amounts to USD
 */
export async function batchConvertSTXtoUSD(amounts: number[]) {
  const response = await fetch(`${API_BASE_URL}/convert/batch`, {
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

  return response.json();
}

/**
 * Get cache status information
 */
export async function getCacheStatus() {
  const response = await fetch(`${API_BASE_URL}/cache-status`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get cache status');
  }

  return response.json();
}

/**
 * Clear the price cache (triggers fresh fetch on next request)
 */
export async function clearCache() {
  const response = await fetch(`${API_BASE_URL}/cache-clear`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to clear cache');
  }

  return response.json();
}

export default {
  getSTXPrice,
  getFormattedSTXPrice,
  getRawSTXPrice,
  convertSTXtoUSD,
  convertUSDtoSTX,
  batchConvertSTXtoUSD,
  getCacheStatus,
  clearCache
};
