const { RATE_LIMIT_TIERS, TIER_LEVELS, ENDPOINT_OVERRIDES } = require('../config/rateLimitConfig');

/**
 * Rate Limit Utility Functions
 * 
 * Helper functions for rate limit calculations, formatting, and validation.
 * 
 * @module utils/rateLimitUtils
 */

/**
 * Format milliseconds into a human-readable duration string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.ceil(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.ceil(ms / 3600000)}h`;
  return `${Math.ceil(ms / 86400000)}d`;
}

/**
 * Calculate the percentage of rate limit used
 * @param {number} current - Current request count
 * @param {number} limit - Maximum allowed requests
 * @returns {number} Percentage used (0-100)
 */
function calculateUsagePercentage(current, limit) {
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Determine the rate limit status level based on usage
 * @param {number} percentage - Usage percentage
 * @returns {string} Status level: 'ok' | 'warning' | 'critical' | 'exceeded'
 */
function getStatusLevel(percentage) {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'ok';
}

/**
 * Validate a tier name
 * @param {string} tier - Tier name to validate
 * @returns {boolean} Whether the tier is valid
 */
function isValidTier(tier) {
  return Object.values(TIER_LEVELS).includes(tier);
}

/**
 * Get the next tier upgrade from the current tier
 * @param {string} currentTier - Current tier level
 * @returns {string|null} Next tier level or null if at max
 */
function getNextTier(currentTier) {
  const tierOrder = [
    TIER_LEVELS.FREE,
    TIER_LEVELS.BASIC,
    TIER_LEVELS.PREMIUM,
    TIER_LEVELS.ENTERPRISE,
    TIER_LEVELS.ADMIN
  ];

  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return null;
  }
  return tierOrder[currentIndex + 1];
}

/**
 * Compare two tiers and return the difference in limits
 * @param {string} tierA - First tier
 * @param {string} tierB - Second tier
 * @returns {Object} Comparison of limits between tiers
 */
function compareTiers(tierA, tierB) {
  const configA = RATE_LIMIT_TIERS[tierA];
  const configB = RATE_LIMIT_TIERS[tierB];

  if (!configA || !configB) {
    throw new Error('Invalid tier provided for comparison');
  }

  return {
    tierA: {
      name: tierA,
      ...configA
    },
    tierB: {
      name: tierB,
      ...configB
    },
    differences: {
      maxRequests: configB.maxRequests - configA.maxRequests,
      burstLimit: configB.burstLimit - configA.burstLimit,
      dailyLimit: configB.dailyLimit - configA.dailyLimit,
      concurrentLimit: configB.concurrentLimit - configA.concurrentLimit
    },
    multipliers: {
      maxRequests: configA.maxRequests > 0 ? (configB.maxRequests / configA.maxRequests).toFixed(1) : 'N/A',
      burstLimit: configA.burstLimit > 0 ? (configB.burstLimit / configA.burstLimit).toFixed(1) : 'N/A',
      dailyLimit: configA.dailyLimit > 0 ? (configB.dailyLimit / configA.dailyLimit).toFixed(1) : 'N/A',
      concurrentLimit: configA.concurrentLimit > 0 ? (configB.concurrentLimit / configA.concurrentLimit).toFixed(1) : 'N/A'
    }
  };
}

/**
 * Get all available tiers with their configurations
 * @returns {Array<Object>} Array of tier configurations
 */
function getAllTiers() {
  return Object.entries(RATE_LIMIT_TIERS).map(([name, config]) => ({
    name,
    ...config,
    windowFormatted: formatDuration(config.windowMs),
    burstWindowFormatted: formatDuration(config.burstWindowMs)
  }));
}

/**
 * Get endpoint overrides summary
 * @returns {Array<Object>} Array of endpoint override configurations
 */
function getEndpointOverrides() {
  return Object.entries(ENDPOINT_OVERRIDES).map(([endpoint, config]) => ({
    endpoint,
    ...config
  }));
}

/**
 * Calculate estimated time until rate limit resets
 * @param {Date} windowStart - When the current window started
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {number} Seconds until reset
 */
function getTimeUntilReset(windowStart, windowMs) {
  const windowEnd = new Date(windowStart.getTime() + windowMs);
  const now = new Date();
  const remaining = windowEnd - now;
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Generate a rate limit summary for logging
 * @param {Object} result - Rate limit check result
 * @param {string} key - Rate limit key
 * @param {string} tier - User tier
 * @returns {string} Formatted log message
 */
function formatRateLimitLog(result, key, tier) {
  if (result.allowed) {
    return `[RateLimit] ALLOWED key=${key} tier=${tier} window=${result.current.windowRequests}/${result.limits.maxRequests} daily=${result.current.dailyRequests}/${result.limits.dailyLimit}`;
  }
  return `[RateLimit] DENIED key=${key} tier=${tier} reason=${result.reason} retryAfter=${result.retryAfter}s`;
}

/**
 * Parse rate limit headers from a response
 * @param {Object} headers - Response headers
 * @returns {Object} Parsed rate limit information
 */
function parseRateLimitHeaders(headers) {
  return {
    limit: parseInt(headers['x-ratelimit-limit']) || null,
    remaining: parseInt(headers['x-ratelimit-remaining']) || null,
    reset: parseInt(headers['x-ratelimit-reset']) || null,
    retryAfter: parseInt(headers['retry-after']) || null,
    tier: headers['x-ratelimit-tier'] || null,
    dailyLimit: parseInt(headers['x-ratelimit-daily-limit']) || null,
    dailyRemaining: parseInt(headers['x-ratelimit-daily-remaining']) || null
  };
}

/**
 * Calculate the cost of a request based on its type
 * Used for weighted rate limiting where some requests cost more
 * @param {string} method - HTTP method
 * @param {string} endpoint - Request endpoint
 * @returns {number} Request cost (1 = standard)
 */
function calculateRequestCost(method, endpoint) {
  // Write operations cost more
  const methodCosts = {
    GET: 1,
    HEAD: 0.5,
    OPTIONS: 0.5,
    POST: 2,
    PUT: 2,
    PATCH: 1.5,
    DELETE: 3
  };

  return methodCosts[method.toUpperCase()] || 1;
}

module.exports = {
  formatDuration,
  calculateUsagePercentage,
  getStatusLevel,
  isValidTier,
  getNextTier,
  compareTiers,
  getAllTiers,
  getEndpointOverrides,
  getTimeUntilReset,
  formatRateLimitLog,
  parseRateLimitHeaders,
  calculateRequestCost
};
