const { RATE_LIMIT_HEADERS, DEFAULTS } = require('../config/rateLimitConfig');
const {
  resolveUserTier,
  generateKey,
  checkRateLimit,
  releaseRequest,
  isWhitelisted,
  isBlacklisted
} = require('../services/rateLimitService');

/**
 * Tiered Rate Limiter Middleware
 * 
 * Applies rate limiting based on user subscription tier.
 * Supports window-based, burst, daily, and concurrent request limiting.
 * 
 * @module middleware/rateLimiter
 */

/**
 * Create a tiered rate limiter middleware
 * @param {Object} options - Override options
 * @param {boolean} options.skipAuth - Skip authentication check
 * @param {string} options.tierOverride - Force a specific tier
 * @param {boolean} options.strict - Use stricter limits (0.5x multiplier)
 * @param {boolean} options.lenient - Use more lenient limits (2x multiplier)
 * @returns {Function} Express middleware function
 */
function createTieredRateLimiter(options = {}) {
  return async function tieredRateLimiter(req, res, next) {
    try {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';

      // Check whitelist
      if (isWhitelisted(ip)) {
        return next();
      }

      // Check blacklist
      if (isBlacklisted(ip)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address has been blocked'
        });
      }

      // Resolve user tier
      const tier = options.tierOverride || resolveUserTier(req);

      // Generate rate limit key
      const key = generateKey(req);

      // Get the endpoint path
      const endpoint = req.baseUrl + req.path;

      // Check rate limit
      const result = await checkRateLimit(key, tier, endpoint);

      // Set rate limit headers regardless of result
      setRateLimitHeaders(res, result, tier);

      if (!result.allowed) {
        // Release the concurrent request counter since we're rejecting
        await releaseRequest(key);

        return res.status(DEFAULTS.statusCode).json({
          error: 'Rate limit exceeded',
          message: getRateLimitMessage(result.reason),
          tier,
          retryAfter: result.retryAfter,
          limits: {
            maxRequests: result.limits.maxRequests,
            windowMs: result.limits.windowMs,
            dailyLimit: result.limits.dailyLimit
          },
          current: result.current
        });
      }

      // Store key on request for cleanup
      req.rateLimitKey = key;

      // Release concurrent request counter when response finishes
      res.on('finish', async () => {
        try {
          await releaseRequest(key);
        } catch (err) {
          console.error('Error releasing rate limit on finish:', err.message);
        }
      });

      next();
    } catch (error) {
      console.error('Rate limiter error:', error.message);
      // On error, allow the request through (fail-open)
      next();
    }
  };
}

/**
 * Set rate limit response headers
 * @param {Object} res - Express response object
 * @param {Object} result - Rate limit check result
 * @param {string} tier - User tier
 */
function setRateLimitHeaders(res, result, tier) {
  res.set(RATE_LIMIT_HEADERS.TIER, tier);
  res.set(RATE_LIMIT_HEADERS.LIMIT, String(result.limits.maxRequests));

  if (result.remaining) {
    res.set(RATE_LIMIT_HEADERS.REMAINING, String(result.remaining.window));
    res.set(RATE_LIMIT_HEADERS.DAILY_LIMIT, String(result.limits.dailyLimit));
    res.set(RATE_LIMIT_HEADERS.DAILY_REMAINING, String(result.remaining.daily));
  }

  if (result.resetAt) {
    res.set(RATE_LIMIT_HEADERS.RESET, String(Math.ceil(result.resetAt.getTime() / 1000)));
  }

  if (result.retryAfter) {
    res.set(RATE_LIMIT_HEADERS.RETRY_AFTER, String(result.retryAfter));
  }
}

/**
 * Get a human-readable rate limit message
 * @param {string} reason - Rate limit reason code
 * @returns {string} Human-readable message
 */
function getRateLimitMessage(reason) {
  const messages = {
    blocked: 'Your access has been temporarily blocked due to repeated rate limit violations. Please wait before trying again.',
    window_limit_exceeded: 'You have exceeded the maximum number of requests for this time window. Please wait before making more requests.',
    burst_limit_exceeded: 'You are making requests too quickly. Please slow down and try again shortly.',
    daily_limit_exceeded: 'You have reached your daily request limit. Your limit will reset at midnight UTC.',
    concurrent_limit_exceeded: 'Too many concurrent requests. Please wait for your current requests to complete.'
  };

  return messages[reason] || DEFAULTS.rateLimitMessage;
}

/**
 * Strict rate limiter - applies 0.5x multiplier to all limits
 * Useful for sensitive endpoints like wallet operations
 */
function createStrictRateLimiter() {
  return createTieredRateLimiter({ strict: true });
}

/**
 * Lenient rate limiter - applies 2x multiplier to all limits
 * Useful for read-heavy endpoints like content browsing
 */
function createLenientRateLimiter() {
  return createTieredRateLimiter({ lenient: true });
}

/**
 * API key rate limiter - uses API key for identification
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
function createApiKeyRateLimiter(options = {}) {
  return async function apiKeyRateLimiter(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return createTieredRateLimiter(options)(req, res, next);
      }

      // Use API key as the rate limit key
      const key = `apikey:${apiKey}`;
      const tier = options.tierOverride || resolveUserTier(req);
      const endpoint = req.baseUrl + req.path;

      const result = await checkRateLimit(key, tier, endpoint);
      setRateLimitHeaders(res, result, tier);

      if (!result.allowed) {
        await releaseRequest(key);
        return res.status(DEFAULTS.statusCode).json({
          error: 'Rate limit exceeded',
          message: getRateLimitMessage(result.reason),
          retryAfter: result.retryAfter
        });
      }

      req.rateLimitKey = key;
      res.on('finish', () => releaseRequest(key).catch(() => {}));

      next();
    } catch (error) {
      console.error('API key rate limiter error:', error.message);
      next();
    }
  };
}

// Export the default middleware and factory functions
module.exports = {
  tieredRateLimiter: createTieredRateLimiter(),
  createTieredRateLimiter,
  createStrictRateLimiter,
  createLenientRateLimiter,
  createApiKeyRateLimiter,
  setRateLimitHeaders,
  getRateLimitMessage
};
