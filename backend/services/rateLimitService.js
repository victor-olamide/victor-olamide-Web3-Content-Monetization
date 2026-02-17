const RateLimitStore = require('../models/RateLimitStore');
const { RATE_LIMIT_TIERS, ENDPOINT_OVERRIDES, DEFAULTS, TIER_LEVELS } = require('../config/rateLimitConfig');

/**
 * Rate Limit Service
 * 
 * Core service for managing tiered rate limiting.
 * Handles request counting, tier resolution, and limit enforcement.
 * 
 * @module services/rateLimitService
 */

/**
 * Resolve the user's subscription tier
 * @param {Object} req - Express request object
 * @returns {string} The user's tier level
 */
function resolveUserTier(req) {
  // Check if tier is set by authentication middleware
  if (req.userTier) return req.userTier;
  if (req.session?.tier) return req.session.tier;
  if (req.user?.tier) return req.user.tier;
  if (req.wallet?.tier) return req.wallet.tier;

  // Check subscription data attached by wallet auth
  if (req.subscription?.tier) return req.subscription.tier;

  // Check custom header (for API key-based tier identification)
  const headerTier = req.headers['x-user-tier'];
  if (headerTier && Object.values(TIER_LEVELS).includes(headerTier)) {
    return headerTier;
  }

  return DEFAULTS.defaultTier;
}

/**
 * Generate a unique key for rate limiting
 * @param {Object} req - Express request object
 * @returns {string} Unique rate limit key
 */
function generateKey(req) {
  const strategy = DEFAULTS.keyGenerator;

  const walletAddress = req.walletAddress || req.session?.walletAddress || req.headers['x-wallet-address'];
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  switch (strategy) {
    case 'wallet':
      return walletAddress ? `wallet:${walletAddress}` : `ip:${ip}`;
    case 'ip':
      return `ip:${ip}`;
    case 'combined':
      return walletAddress ? `combined:${walletAddress}:${ip}` : `ip:${ip}`;
    default:
      return walletAddress ? `wallet:${walletAddress}` : `ip:${ip}`;
  }
}

/**
 * Get the effective rate limit for a tier and endpoint
 * @param {string} tier - User tier
 * @param {string} endpoint - Request endpoint path
 * @returns {Object} Effective rate limit configuration
 */
function getEffectiveLimit(tier, endpoint) {
  const tierConfig = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS[DEFAULTS.defaultTier];
  
  if (!DEFAULTS.enableEndpointOverrides) {
    return { ...tierConfig };
  }

  // Check for endpoint-specific overrides
  const matchingEndpoint = Object.keys(ENDPOINT_OVERRIDES).find(ep => endpoint.startsWith(ep));
  
  if (matchingEndpoint) {
    const override = ENDPOINT_OVERRIDES[matchingEndpoint];
    return {
      ...tierConfig,
      maxRequests: Math.floor(tierConfig.maxRequests * override.multiplier),
      burstLimit: Math.floor(tierConfig.burstLimit * override.multiplier),
      dailyLimit: Math.floor(tierConfig.dailyLimit * override.multiplier)
    };
  }

  return { ...tierConfig };
}

/**
 * Check if a request should be rate limited
 * @param {string} key - Rate limit key
 * @param {string} tier - User tier
 * @param {string} endpoint - Request endpoint
 * @returns {Promise<Object>} Rate limit check result
 */
async function checkRateLimit(key, tier, endpoint) {
  const limits = getEffectiveLimit(tier, endpoint);
  const record = await RateLimitStore.findOrCreate(key, tier);

  // Check if entity is blocked due to repeated violations
  if (record.isBlocked()) {
    return {
      allowed: false,
      reason: 'blocked',
      blockedUntil: record.blockedUntil,
      retryAfter: Math.ceil((record.blockedUntil - new Date()) / 1000),
      limits,
      current: {
        windowRequests: record.windowRequests,
        burstRequests: record.burstRequests,
        dailyRequests: record.dailyRequests,
        activeRequests: record.activeRequests
      }
    };
  }

  // Reset expired windows
  if (record.isWindowExpired(limits.windowMs)) {
    record.resetWindow();
  }
  if (record.isBurstWindowExpired(limits.burstWindowMs)) {
    record.resetBurst();
  }
  if (record.shouldResetDaily()) {
    record.resetDaily();
  }

  // Check window limit
  if (record.windowRequests >= limits.maxRequests) {
    record.recordViolation();
    await record.save();
    const windowEnd = new Date(record.windowStart.getTime() + limits.windowMs);
    return {
      allowed: false,
      reason: 'window_limit_exceeded',
      retryAfter: Math.ceil((windowEnd - new Date()) / 1000),
      limits,
      current: {
        windowRequests: record.windowRequests,
        burstRequests: record.burstRequests,
        dailyRequests: record.dailyRequests,
        activeRequests: record.activeRequests
      }
    };
  }

  // Check burst limit
  if (DEFAULTS.enableBurstProtection && record.burstRequests >= limits.burstLimit) {
    record.recordViolation();
    await record.save();
    const burstEnd = new Date(record.burstWindowStart.getTime() + limits.burstWindowMs);
    return {
      allowed: false,
      reason: 'burst_limit_exceeded',
      retryAfter: Math.ceil((burstEnd - new Date()) / 1000),
      limits,
      current: {
        windowRequests: record.windowRequests,
        burstRequests: record.burstRequests,
        dailyRequests: record.dailyRequests,
        activeRequests: record.activeRequests
      }
    };
  }

  // Check daily limit
  if (DEFAULTS.enableDailyLimits && record.dailyRequests >= limits.dailyLimit) {
    record.recordViolation();
    await record.save();
    return {
      allowed: false,
      reason: 'daily_limit_exceeded',
      retryAfter: Math.ceil((record.dailyResetAt - new Date()) / 1000),
      limits,
      current: {
        windowRequests: record.windowRequests,
        burstRequests: record.burstRequests,
        dailyRequests: record.dailyRequests,
        activeRequests: record.activeRequests
      }
    };
  }

  // Check concurrent limit
  if (DEFAULTS.enableConcurrentLimits && record.activeRequests >= limits.concurrentLimit) {
    return {
      allowed: false,
      reason: 'concurrent_limit_exceeded',
      retryAfter: 1,
      limits,
      current: {
        windowRequests: record.windowRequests,
        burstRequests: record.burstRequests,
        dailyRequests: record.dailyRequests,
        activeRequests: record.activeRequests
      }
    };
  }

  // Increment counters
  record.windowRequests += 1;
  record.burstRequests += 1;
  record.dailyRequests += 1;
  record.activeRequests += 1;
  record.lastRequestAt = new Date();

  // Track endpoint-specific counts
  const endpointKey = endpoint.split('/').slice(0, 3).join('/');
  const currentCount = record.endpointCounts.get(endpointKey) || 0;
  record.endpointCounts.set(endpointKey, currentCount + 1);

  await record.save();

  const windowEnd = new Date(record.windowStart.getTime() + limits.windowMs);

  return {
    allowed: true,
    limits,
    current: {
      windowRequests: record.windowRequests,
      burstRequests: record.burstRequests,
      dailyRequests: record.dailyRequests,
      activeRequests: record.activeRequests
    },
    remaining: {
      window: limits.maxRequests - record.windowRequests,
      burst: limits.burstLimit - record.burstRequests,
      daily: limits.dailyLimit - record.dailyRequests,
      concurrent: limits.concurrentLimit - record.activeRequests
    },
    resetAt: windowEnd
  };
}

/**
 * Decrement the active request counter when a request completes
 * @param {string} key - Rate limit key
 * @returns {Promise<void>}
 */
async function releaseRequest(key) {
  try {
    await RateLimitStore.findOneAndUpdate(
      { key, activeRequests: { $gt: 0 } },
      { $inc: { activeRequests: -1 } }
    );
  } catch (error) {
    console.error('Error releasing rate limit request:', error.message);
  }
}

/**
 * Get rate limit status for a specific key
 * @param {string} key - Rate limit key
 * @param {string} tier - User tier
 * @param {string} endpoint - Request endpoint
 * @returns {Promise<Object>} Current rate limit status
 */
async function getRateLimitStatus(key, tier, endpoint) {
  const limits = getEffectiveLimit(tier, endpoint || '/api');
  const record = await RateLimitStore.findOne({ key });

  if (!record) {
    return {
      tier,
      limits,
      current: {
        windowRequests: 0,
        burstRequests: 0,
        dailyRequests: 0,
        activeRequests: 0
      },
      remaining: {
        window: limits.maxRequests,
        burst: limits.burstLimit,
        daily: limits.dailyLimit,
        concurrent: limits.concurrentLimit
      },
      isBlocked: false,
      violations: 0
    };
  }

  return {
    tier: record.tier,
    limits,
    current: {
      windowRequests: record.windowRequests,
      burstRequests: record.burstRequests,
      dailyRequests: record.dailyRequests,
      activeRequests: record.activeRequests
    },
    remaining: {
      window: Math.max(0, limits.maxRequests - record.windowRequests),
      burst: Math.max(0, limits.burstLimit - record.burstRequests),
      daily: Math.max(0, limits.dailyLimit - record.dailyRequests),
      concurrent: Math.max(0, limits.concurrentLimit - record.activeRequests)
    },
    isBlocked: record.isBlocked(),
    blockedUntil: record.blockedUntil,
    violations: record.violations,
    lastViolationAt: record.lastViolationAt,
    lastRequestAt: record.lastRequestAt
  };
}

/**
 * Reset rate limits for a specific key
 * @param {string} key - Rate limit key
 * @returns {Promise<boolean>} Whether the reset was successful
 */
async function resetRateLimit(key) {
  const result = await RateLimitStore.findOneAndUpdate(
    { key },
    {
      windowRequests: 0,
      burstRequests: 0,
      dailyRequests: 0,
      activeRequests: 0,
      violations: 0,
      blockedUntil: null,
      lastViolationAt: null,
      windowStart: new Date(),
      burstWindowStart: new Date()
    },
    { new: true }
  );
  return !!result;
}

/**
 * Get global rate limit statistics
 * @returns {Promise<Object>} Global statistics
 */
async function getGlobalStats() {
  return RateLimitStore.getStats();
}

/**
 * Clean up expired rate limit records
 * @returns {Promise<number>} Number of cleaned up records
 */
async function cleanupExpiredRecords() {
  return RateLimitStore.cleanupExpired();
}

/**
 * Update a user's tier
 * @param {string} key - Rate limit key
 * @param {string} newTier - New tier level
 * @returns {Promise<boolean>} Whether the update was successful
 */
async function updateUserTier(key, newTier) {
  if (!Object.values(TIER_LEVELS).includes(newTier)) {
    throw new Error(`Invalid tier: ${newTier}`);
  }

  const result = await RateLimitStore.findOneAndUpdate(
    { key },
    { tier: newTier },
    { new: true }
  );
  return !!result;
}

/**
 * Check if an IP is whitelisted
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isWhitelisted(ip) {
  return DEFAULTS.whitelistedIPs.includes(ip);
}

/**
 * Check if an IP is blacklisted
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isBlacklisted(ip) {
  return DEFAULTS.blacklistedIPs.includes(ip);
}

module.exports = {
  resolveUserTier,
  generateKey,
  getEffectiveLimit,
  checkRateLimit,
  releaseRequest,
  getRateLimitStatus,
  resetRateLimit,
  getGlobalStats,
  cleanupExpiredRecords,
  updateUserTier,
  isWhitelisted,
  isBlacklisted
};
