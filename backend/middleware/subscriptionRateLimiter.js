/**
 * Subscription-Based Rate Limiting Middleware
 * 
 * Middleware that applies rate limits based on user subscription tier.
 * Integrates with the subscription system to dynamically adjust limits.
 * 
 * @module middleware/subscriptionRateLimiter
 */

const {
  resolveUserTierFromSubscription,
  attachSubscriptionToRequest
} = require('../services/subscriptionAwareRateLimitService');
const { checkRateLimit, releaseRequest } = require('../services/rateLimitService');
const { generateKey } = require('../services/rateLimitService');
const { DEFAULTS } = require('../config/rateLimitConfig');

/**
 * Create a subscription-based rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.fetchSubscription - Fetch subscription data (default: true)
 * @param {boolean} options.cacheSubscription - Cache subscription in request (default: true)
 * @param {number} options.cacheMaxAge - Cache max age in ms (default: 300000 - 5 mins)
 * @returns {Function} Express middleware
 */
function createSubscriptionRateLimiter(options = {}) {
  const {
    fetchSubscription = true,
    cacheSubscription = true,
    cacheMaxAge = 300000 // 5 minutes
  } = options;

  return async function subscriptionRateLimiter(req, res, next) {
    try {
      let tier;

      // If subscription data is already attached and cached, use it
      if (req.subscription && req.subscriptionFetchedAt) {
        const cacheAge = Date.now() - req.subscriptionFetchedAt;
        if (cacheAge < cacheMaxAge) {
          tier = req.subscription.tier;
        }
      }

      // If we need fresh tier data, fetch it with subscription info
      if (!tier) {
        if (fetchSubscription) {
          // Attach subscription data to request
          const userId = req.userId || req.user?._id || req.session?.userId || req.headers['x-user-id'];
          if (userId) {
            const creatorId = req.params?.creatorId || req.query?.creatorId;
            req.subscription = await attachSubscriptionToRequest(userId, creatorId);
            req.subscriptionFetchedAt = Date.now();
            tier = req.subscription.tier;
          } else {
            // No user ID, resolve from alternative sources
            tier = await resolveUserTierFromSubscription(req);
          }
        } else {
          // Use subscription-aware resolution without database fetch
          tier = await resolveUserTierFromSubscription(req);
        }
      }

      // Store tier on request for downstream use
      req.userTier = tier;
      req.rateLimitTier = tier;

      // Generate rate limit key
      const key = generateKey(req);
      const endpoint = req.baseUrl + req.path;

      // Check rate limit
      const result = await checkRateLimit(key, tier, endpoint);

      // Set rate limit headers
      setSubscriptionRateLimitHeaders(res, result, tier, req.subscription);

      if (!result.allowed) {
        await releaseRequest(key);

        return res.status(DEFAULTS.statusCode).json({
          error: 'Rate limit exceeded',
          message: getRateLimitMessage(result.reason, tier),
          tier,
          subscription: cacheSubscription && req.subscription ? {
            hasSubscription: req.subscription.hasSubscription,
            tierName: req.subscription.tierName,
            expiryDate: req.subscription.expiryDate,
            renewalStatus: req.subscription.renewalStatus
          } : undefined,
          retryAfter: result.retryAfter,
          limits: {
            maxRequests: result.limits.maxRequests,
            windowMs: result.limits.windowMs,
            dailyLimit: result.limits.dailyLimit,
            concurrentLimit: result.limits.concurrentLimit
          },
          current: result.current
        });
      }

      // Store key for later release
      req.rateLimitKey = key;

      // Release concurrent counter when response finishes
      res.on('finish', async () => {
        try {
          await releaseRequest(key);
        } catch (err) {
          console.error('Error releasing rate limit on finish:', err.message);
        }
      });

      next();
    } catch (error) {
      console.error('Subscription rate limiter error:', error.message);
      // Fail-open on error
      next();
    }
  };
}

/**
 * Set rate limit response headers with subscription info
 * @param {Object} res - Express response object
 * @param {Object} result - Rate limit check result
 * @param {string} tier - User tier
 * @param {Object} subscription - Subscription data
 */
function setSubscriptionRateLimitHeaders(res, result, tier, subscription) {
  res.set('X-RateLimit-Tier', tier);
  res.set('X-RateLimit-Limit', String(result.limits.maxRequests));

  if (result.remaining) {
    res.set('X-RateLimit-Remaining', String(result.remaining.window));
    res.set('X-RateLimit-Daily-Limit', String(result.limits.dailyLimit));
    res.set('X-RateLimit-Daily-Remaining', String(result.remaining.daily));
    res.set('X-RateLimit-Concurrent-Remaining', String(result.remaining.concurrent));
  }

  if (result.resetAt) {
    res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt.getTime() / 1000)));
  }

  if (result.retryAfter) {
    res.set('Retry-After', String(result.retryAfter));
  }

  // Add subscription info if available
  if (subscription) {
    if (subscription.tierName) {
      res.set('X-Subscription-Tier', subscription.tierName);
    }
    if (subscription.expiryDate) {
      res.set('X-Subscription-Expiry', subscription.expiryDate.toISOString());
    }
    if (subscription.renewalStatus) {
      res.set('X-Subscription-Renewal-Status', subscription.renewalStatus);
    }
  }
}

/**
 * Get user-friendly message for rate limit with subscription context
 * @param {string} reason - Rate limit reason
 * @param {string} tier - User tier
 * @returns {string} Human-readable message
 */
function getRateLimitMessage(reason, tier) {
  const tierMessages = {
    free: {
      window_limit_exceeded: 'You have exceeded the free tier request limit. Please upgrade your subscription for higher limits.',
      burst_limit_exceeded: 'Your requests are too frequent for the free tier. Please slow down.',
      daily_limit_exceeded: 'You have reached your daily limit. Please upgrade to increase your limit.',
      concurrent_limit_exceeded: 'Too many concurrent requests for free tier. Please wait.'
    },
    basic: {
      window_limit_exceeded: 'You have exceeded your basic tier request limit. Consider upgrading to premium.',
      burst_limit_exceeded: 'Requests are too frequent. Please slow down.',
      daily_limit_exceeded: 'You have reached your daily limit. Consider upgrading.',
      concurrent_limit_exceeded: 'Too many concurrent requests. Please wait.'
    },
    premium: {
      window_limit_exceeded: 'You have exceeded your premium tier request limit. Contact support for higher limits.',
      burst_limit_exceeded: 'Requests are too frequent. Please slow down.',
      daily_limit_exceeded: 'You have reached your daily limit. Contact support if you need more.',
      concurrent_limit_exceeded: 'Too many concurrent requests. Please wait.'
    },
    enterprise: {
      window_limit_exceeded: 'You have approached enterprise limits. Contact support.',
      burst_limit_exceeded: 'Burst limit exceeded. Please optimize your request pattern.',
      daily_limit_exceeded: 'Daily limit exceeded. Contact support for adjustment.',
      concurrent_limit_exceeded: 'Concurrent limit exceeded. Please optimize connections.'
    }
  };

  const generalMessages = {
    blocked: 'Your access has been temporarily blocked due to rate limit violations. Please wait before trying again.',
    window_limit_exceeded: 'You have exceeded the maximum number of requests for this time window. Please wait.',
    burst_limit_exceeded: 'You are making requests too quickly. Please slow down and try again shortly.',
    daily_limit_exceeded: 'You have reached your daily request limit. Your limit will reset at midnight UTC.',
    concurrent_limit_exceeded: 'Too many concurrent requests. Please wait for your current requests to complete.'
  };

  return (tierMessages[tier]?.[reason] || generalMessages[reason] || 'Rate limit exceeded. Please try again later.');
}

/**
 * Subscription tier upgrade detector middleware
 * Temporarily increases rate limits for users who just upgraded
 */
function createUpgradeAwareRateLimiter() {
  return async function upgradeAwareRateLimiter(req, res, next) {
    try {
      const subscription = req.subscription || {};
      
      // Track upgrade time in session if subscription is fresh (upgraded in last hour)
      if (subscription.subscriptionId && req.session) {
        const now = Date.now();
        req.session.lastSubscriptionChange = now;
      }

      // Call the main subscription rate limiter
      return createSubscriptionRateLimiter()(req, res, next);
    } catch (error) {
      console.error('Upgrade aware rate limiter error:', error.message);
      next();
    }
  };
}

module.exports = {
  createSubscriptionRateLimiter,
  createUpgradeAwareRateLimiter,
  setSubscriptionRateLimitHeaders,
  getRateLimitMessage,
  subscriptionRateLimiter: createSubscriptionRateLimiter()
};
