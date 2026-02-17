/**
 * Rate Limiting Error Handler
 * 
 * Centralized error handling and recovery for rate limiting
 * Creates consistent error responses and handles edge cases.
 * 
 * @module utils/rateLimitErrorHandler
 */

const { DEFAULTS } = require('../config/rateLimitConfig');

/**
 * Rate Limit Error Codes
 */
const ERROR_CODES = {
  LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  WINDOW_EXCEEDED: 'WINDOW_LIMIT_EXCEEDED',
  BURST_EXCEEDED: 'BURST_LIMIT_EXCEEDED',
  DAILY_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  CONCURRENT_EXCEEDED: 'CONCURRENT_LIMIT_EXCEEDED',
  BLOCKED: 'USER_BLOCKED',
  INVALID_TIER: 'INVALID_TIER',
  INVALID_KEY: 'INVALID_KEY',
  MISSING_KEY: 'MISSING_KEY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  TIER_CHANGE_ERROR: 'TIER_CHANGE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Create a rate limited response
 * @param {Object} options - Response options
 * @returns {Object} Error response
 */
function createRateLimitedResponse(options = {}) {
  const {
    reason = 'window_limit_exceeded',
    tier = 'free',
    retryAfter = 60,
    limits = {},
    current = {},
    subscription = {}
  } = options;

  const errorCode = getErrorCode(reason);
  const message = getErrorMessage(reason, tier);

  return {
    success: false,
    error: 'Rate limit exceeded',
    errorCode,
    message,
    details: {
      reason,
      tier,
      retryAfter,
      limits: {
        maxRequests: limits.maxRequests || DEFAULTS.maxRequests,
        windowMs: limits.windowMs || DEFAULTS.windowMs,
        dailyLimit: limits.dailyLimit || DEFAULTS.dailyLimit,
        concurrentLimit: limits.concurrentLimit || DEFAULTS.concurrentLimit
      },
      current: {
        windowRequests: current.windowRequests || 0,
        burstRequests: current.burstRequests || 0,
        dailyRequests: current.dailyRequests || 0,
        activeRequests: current.activeRequests || 0
      },
      subscription
    },
    timestamp: new Date().toISOString(),
    statusCode: DEFAULTS.statusCode
  };
}

/**
 * Get error code for a reason
 * @param {string} reason - Error reason
 * @returns {string} Error code
 */
function getErrorCode(reason) {
  const codeMap = {
    'blocked': ERROR_CODES.BLOCKED,
    'window_limit_exceeded': ERROR_CODES.WINDOW_EXCEEDED,
    'burst_limit_exceeded': ERROR_CODES.BURST_EXCEEDED,
    'daily_limit_exceeded': ERROR_CODES.DAILY_EXCEEDED,
    'concurrent_limit_exceeded': ERROR_CODES.CONCURRENT_EXCEEDED
  };

  return codeMap[reason] || ERROR_CODES.LIMIT_EXCEEDED;
}

/**
 * Get user-friendly error message for a reason
 * @param {string} reason - Error reason
 * @param {string} tier - User tier
 * @returns {string} Error message
 */
function getErrorMessage(reason, tier) {
  const tierMessages = {
    free: {
      'window_limit_exceeded': 'You have exceeded the free tier request limit. Please upgrade your subscription for higher limits.',
      'burst_limit_exceeded': 'Your requests are too frequent for the free tier. Please slow down and try again in a moment.',
      'daily_limit_exceeded': 'You have reached your daily limit. Your limit will reset tomorrow at midnight UTC.',
      'concurrent_limit_exceeded': 'Too many concurrent requests for free tier. Please wait for current requests to complete.',
      'blocked': 'Your access has been temporarily blocked due to rate limit violations. Please wait before trying again.'
    },
    basic: {
      'window_limit_exceeded': 'You have exceeded your basic tier request limit. Consider upgrading to premium for higher limits.',
      'burst_limit_exceeded': 'Your requests are too frequent. Please slow down and try again.',
      'daily_limit_exceeded': 'You have reached your daily limit. Consider upgrading your subscription.',
      'concurrent_limit_exceeded': 'Too many concurrent requests. Please wait for current requests to complete.',
      'blocked': 'Your access has been temporarily blocked. Please wait before trying again.'
    },
    premium: {
      'window_limit_exceeded': 'You have exceeded your premium tier request limit. Contact support if you need higher limits.',
      'burst_limit_exceeded': 'Your requests are too frequent. Please optimize your request pattern.',
      'daily_limit_exceeded': 'You have reached your daily limit. Contact support if you need more.',
      'concurrent_limit_exceeded': 'Too many concurrent requests. Please wait or contact support.',
      'blocked': 'Your access has been temporarily blocked. Please contact support.'
    },
    enterprise: {
      'window_limit_exceeded': 'You have approached enterprise limits. Contact support for adjustment.',
      'burst_limit_exceeded': 'Burst limit exceeded. Please optimize your request pattern.',
      'daily_limit_exceeded': 'Daily limit exceeded. Contact support for adjustment.',
      'concurrent_limit_exceeded': 'Concurrent limit exceeded. Contact support for optimization.',
      'blocked': 'Access temporarily blocked. Contact support immediately.'
    }
  };

  return (tierMessages[tier]?.[reason] || tierMessages.free[reason] || 'Rate limit exceeded. Please try again later.');
}

/**
 * Create a validation error response
 * @param {Object} validationResult - Validation result from validation utility
 * @returns {Object} Error response
 */
function createValidationErrorResponse(validationResult) {
  return {
    success: false,
    error: 'Validation failed',
    errorCode: ERROR_CODES.VALIDATION_ERROR,
    message: 'Your request contains invalid data',
    details: {
      errors: validationResult.errors || [],
      errorCount: validationResult.errors?.length || 0
    },
    timestamp: new Date().toISOString(),
    statusCode: 400
  };
}

/**
 * Create a tier change error response
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {Object} Error response
 */
function createTierChangeErrorResponse(message, details = {}) {
  return {
    success: false,
    error: 'Tier change failed',
    errorCode: ERROR_CODES.TIER_CHANGE_ERROR,
    message,
    details,
    timestamp: new Date().toISOString(),
    statusCode: 500
  };
}

/**
 * Handle database errors in rate limiting
 * @param {Error} error - Database error
 * @param {string} operation - Operation that failed
 * @returns {Object} Error response
 */
function handleDatabaseError(error, operation = 'database operation') {
  console.error(`[RATE_LIMIT_DB_ERROR] ${operation}: ${error.message}`);

  return {
    success: false,
    error: 'Database error',
    errorCode: ERROR_CODES.DATABASE_ERROR,
    message: 'An error occurred while processing your request. Please try again later.',
    details: {
      operation,
      timestamp: new Date().toISOString()
    },
    statusCode: 500
  };
}

/**
 * Handle cache errors in rate limiting
 * @param {Error} error - Cache error
 * @param {string} operation - Operation that failed
 * @returns {Object} Error response
 */
function handleCacheError(error, operation = 'cache operation') {
  console.error(`[RATE_LIMIT_CACHE_ERROR] ${operation}: ${error.message}`);

  // Cache errors are non-critical, return success but log issue
  return {
    success: true,
    warning: 'Cache operation failed',
    errorCode: ERROR_CODES.CACHE_ERROR,
    message: 'Request processed, but some optimization features may be unavailable.',
    timestamp: new Date().toISOString()
  };
}

/**
 * Create recovery suggestion based on error
 * @param {string} errorCode - Error code
 * @param {Object} context - Additional context
 * @returns {Object} Recovery suggestion
 */
function getRecoverySuggestion(errorCode, context = {}) {
  const suggestions = {
    [ERROR_CODES.WINDOW_EXCEEDED]: {
      action: 'wait',
      duration: context.retryAfter || 60,
      message: 'Wait for the current rate limit window to reset'
    },
    [ERROR_CODES.BURST_EXCEEDED]: {
      action: 'slow_down',
      delay: 1000,
      message: 'Space out your requests by at least 1 second'
    },
    [ERROR_CODES.DAILY_EXCEEDED]: {
      action: 'wait_daily',
      duration: 86400,
      message: 'Wait until tomorrow for your daily limit to reset'
    },
    [ERROR_CODES.CONCURRENT_EXCEEDED]: {
      action: 'wait_for_completion',
      suggestion: 'Wait for current requests to complete before making new ones'
    },
    [ERROR_CODES.BLOCKED]: {
      action: 'contact_support',
      message: 'Contact support for assistance with your access issue'
    },
    [ERROR_CODES.INVALID_TIER]: {
      action: 'upgrade_subscription',
      message: 'Upgrade your subscription to access higher rate limits'
    }
  };

  return suggestions[errorCode] || {
    action: 'retry',
    message: 'Please try again later'
  };
}

/**
 * Log rate limiting error
 * @param {Object} errorData - Error data to log
 */
function logRateLimitError(errorData) {
  const {
    userId,
    key,
    tier,
    reason,
    errorCode,
    timestamp = new Date()
  } = errorData;

  console.error('[RATE_LIMIT_ERROR]', {
    userId,
    key,
    tier,
    reason,
    errorCode,
    timestamp: timestamp.toISOString()
  });
}

/**
 * Create generic error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response
 */
function createErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: 'An error occurred',
    message,
    timestamp: new Date().toISOString(),
    statusCode
  };
}

module.exports = {
  ERROR_CODES,
  createRateLimitedResponse,
  createValidationErrorResponse,
  createTierChangeErrorResponse,
  handleDatabaseError,
  handleCacheError,
  getRecoverySuggestion,
  getErrorCode,
  getErrorMessage,
  logRateLimitError,
  createErrorResponse
};
