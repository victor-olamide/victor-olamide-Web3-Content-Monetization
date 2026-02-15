/**
 * Rate Limit Configuration
 * 
 * Defines tiered rate limiting based on user subscription levels.
 * Each tier has different request limits per time window.
 * 
 * @module config/rateLimitConfig
 */

const TIER_LEVELS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
  ADMIN: 'admin'
};

/**
 * Rate limit tiers configuration
 * Each tier defines:
 * - maxRequests: Maximum number of requests allowed in the window
 * - windowMs: Time window in milliseconds
 * - burstLimit: Maximum burst requests allowed in a short period
 * - burstWindowMs: Burst window in milliseconds
 * - dailyLimit: Maximum requests per day
 * - concurrentLimit: Maximum concurrent requests
 */
const RATE_LIMIT_TIERS = {
  [TIER_LEVELS.FREE]: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstLimit: 20,
    burstWindowMs: 60 * 1000, // 1 minute
    dailyLimit: 1000,
    concurrentLimit: 5,
    description: 'Free tier - basic rate limits'
  },
  [TIER_LEVELS.BASIC]: {
    maxRequests: 500,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstLimit: 50,
    burstWindowMs: 60 * 1000, // 1 minute
    dailyLimit: 5000,
    concurrentLimit: 10,
    description: 'Basic tier - standard rate limits'
  },
  [TIER_LEVELS.PREMIUM]: {
    maxRequests: 2000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstLimit: 200,
    burstWindowMs: 60 * 1000, // 1 minute
    dailyLimit: 20000,
    concurrentLimit: 25,
    description: 'Premium tier - elevated rate limits'
  },
  [TIER_LEVELS.ENTERPRISE]: {
    maxRequests: 10000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstLimit: 1000,
    burstWindowMs: 60 * 1000, // 1 minute
    dailyLimit: 100000,
    concurrentLimit: 50,
    description: 'Enterprise tier - high-volume rate limits'
  },
  [TIER_LEVELS.ADMIN]: {
    maxRequests: 50000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstLimit: 5000,
    burstWindowMs: 60 * 1000, // 1 minute
    dailyLimit: 500000,
    concurrentLimit: 100,
    description: 'Admin tier - maximum rate limits'
  }
};

/**
 * Endpoint-specific rate limit overrides
 * Some endpoints may have stricter or more lenient limits
 */
const ENDPOINT_OVERRIDES = {
  '/api/content': {
    multiplier: 1.5, // 50% more requests for content endpoints
    description: 'Content endpoints get higher limits'
  },
  '/api/purchases': {
    multiplier: 0.5, // 50% fewer requests for purchase endpoints (more expensive operations)
    description: 'Purchase endpoints have stricter limits'
  },
  '/api/subscriptions': {
    multiplier: 0.75,
    description: 'Subscription endpoints have moderate limits'
  },
  '/api/wallet': {
    multiplier: 0.5,
    description: 'Wallet endpoints have stricter limits for security'
  },
  '/api/analytics': {
    multiplier: 2.0,
    description: 'Analytics endpoints get higher limits for dashboards'
  },
  '/api/preview': {
    multiplier: 2.0,
    description: 'Preview endpoints get higher limits'
  }
};

/**
 * Rate limit response headers configuration
 */
const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  TIER: 'X-RateLimit-Tier',
  DAILY_LIMIT: 'X-RateLimit-Daily-Limit',
  DAILY_REMAINING: 'X-RateLimit-Daily-Remaining'
};

/**
 * Default configuration values
 */
const DEFAULTS = {
  defaultTier: TIER_LEVELS.FREE,
  storeCleanupInterval: 60 * 60 * 1000, // 1 hour
  enableBurstProtection: true,
  enableDailyLimits: true,
  enableConcurrentLimits: true,
  enableEndpointOverrides: true,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  trustProxy: false,
  keyGenerator: 'wallet', // 'wallet' | 'ip' | 'combined'
  whitelistedIPs: [],
  blacklistedIPs: [],
  rateLimitMessage: 'Too many requests. Please try again later.',
  statusCode: 429
};

module.exports = {
  TIER_LEVELS,
  RATE_LIMIT_TIERS,
  ENDPOINT_OVERRIDES,
  RATE_LIMIT_HEADERS,
  DEFAULTS
};
