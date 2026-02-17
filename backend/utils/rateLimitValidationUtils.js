/**
 * Rate Limit Validation Utilities
 * 
 * Utility functions for validating rate limit requests,
 * tiers, and ensuring data integrity.
 * 
 * @module utils/rateLimitValidationUtils
 */

const { TIER_LEVELS } = require('../config/rateLimitConfig');

/**
 * Validate if a tier string is valid
 * @param {string} tier - Tier to validate
 * @returns {boolean}
 */
function isValidTier(tier) {
  return Object.values(TIER_LEVELS).includes(tier?.toLowerCase?.());
}

/**
 * Validate rate limit key format
 * @param {string} key - Rate limit key
 * @returns {Object} Validation result
 */
function validateRateLimitKey(key) {
  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      error: 'Key must be a non-empty string'
    };
  }

  const validPrefixes = ['wallet:', 'ip:', 'combined:', 'apikey:'];
  const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(prefix));

  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `Key must start with one of: ${validPrefixes.join(', ')}`
    };
  }

  return {
    valid: true
  };
}

/**
 * Validate tier change request
 * @param {Object} tierChangeData - Tier change data
 * @returns {Object} Validation result
 */
function validateTierChangeData(tierChangeData) {
  const errors = [];

  if (!tierChangeData.userId) {
    errors.push('userId is required');
  }

  if (!tierChangeData.oldSubscriptionTier) {
    errors.push('oldSubscriptionTier is required');
  }

  if (!tierChangeData.newSubscriptionTier) {
    errors.push('newSubscriptionTier is required');
  }

  if (!tierChangeData.oldRateLimitTier) {
    errors.push('oldRateLimitTier is required');
  }

  if (!tierChangeData.newRateLimitTier) {
    errors.push('newRateLimitTier is required');
  }

  if (tierChangeData.oldRateLimitTier && !isValidTier(tierChangeData.oldRateLimitTier)) {
    errors.push(`oldRateLimitTier must be one of: ${Object.values(TIER_LEVELS).join(', ')}`);
  }

  if (tierChangeData.newRateLimitTier && !isValidTier(tierChangeData.newRateLimitTier)) {
    errors.push(`newRateLimitTier must be one of: ${Object.values(TIER_LEVELS).join(', ')}`);
  }

  if (tierChangeData.reason) {
    const validReasons = [
      'subscription_change',
      'upgrade_request',
      'downgrade_request',
      'renewal_failed',
      'cancellation',
      'promotion',
      'admin_change',
      'trial_conversion',
      'other'
    ];

    if (!validReasons.includes(tierChangeData.reason)) {
      errors.push(`reason must be one of: ${validReasons.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate rate limit status query
 * @param {Object} query - Query parameters
 * @returns {Object} Validation result
 */
function validateRateLimitStatusQuery(query) {
  const errors = [];

  if (!query.key) {
    errors.push('key is required');
  } else {
    const keyValidation = validateRateLimitKey(query.key);
    if (!keyValidation.valid) {
      errors.push(keyValidation.error);
    }
  }

  if (query.endpoint && typeof query.endpoint !== 'string') {
    errors.push('endpoint must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate tier history query
 * @param {Object} query - Query parameters
 * @returns {Object} Validation result
 */
function validateTierHistoryQuery(query) {
  const errors = [];

  if (!query.userId) {
    errors.push('userId is required');
  }

  if (query.limit) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 500) {
      errors.push('limit must be a number between 1 and 500');
    }
  }

  if (query.offset) {
    const offset = parseInt(query.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('offset must be a non-negative number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean}
 */
function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  // MongoDB ObjectId format or custom string format
  return userId.length > 0;
}

/**
 * Validate wallet address format
 * @param {string} address - Wallet address
 * @returns {boolean}
 */
function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  // Stacks address format: starts with 'S' and is 34 chars, or ETH format: 0x...
  const stacksFormat = /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$/;
  const ethFormat = /^0x[a-fA-F0-9]{40}$/;
  return stacksFormat.test(address) || ethFormat.test(address);
}

/**
 * Sanitize tier change data
 * Remove potentially malicious data
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeTierChangeData(data) {
  const sanitized = { ...data };

  // Validate and trim strings
  if (sanitized.userId) {
    sanitized.userId = String(sanitized.userId).trim();
  }

  if (sanitized.oldSubscriptionTier) {
    sanitized.oldSubscriptionTier = String(sanitized.oldSubscriptionTier).trim().toLowerCase();
  }

  if (sanitized.newSubscriptionTier) {
    sanitized.newSubscriptionTier = String(sanitized.newSubscriptionTier).trim().toLowerCase();
  }

  if (sanitized.oldRateLimitTier) {
    sanitized.oldRateLimitTier = String(sanitized.oldRateLimitTier).trim().toLowerCase();
  }

  if (sanitized.newRateLimitTier) {
    sanitized.newRateLimitTier = String(sanitized.newRateLimitTier).trim().toLowerCase();
  }

  if (sanitized.walletAddress) {
    sanitized.walletAddress = String(sanitized.walletAddress).trim();
  }

  // Validate metadata is object
  if (sanitized.metadata && typeof sanitized.metadata !== 'object') {
    sanitized.metadata = {};
  }

  return sanitized;
}

/**
 * Validate and sanitize rate limit key
 * @param {string} key - Key to validate and sanitize
 * @returns {Object} Result object with valid flag and sanitized key
 */
function validateAndSanitizeKey(key) {
  const validation = validateRateLimitKey(key);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error
    };
  }

  const sanitized = key.trim();

  return {
    valid: true,
    key: sanitized
  };
}

/**
 * Create validation error response
 * @param {Array<string>} errors - Array of error messages
 * @returns {Object} Error response object
 */
function createValidationErrorResponse(errors) {
  return {
    success: false,
    error: 'Validation failed',
    details: errors,
    errorCount: errors.length
  };
}

module.exports = {
  isValidTier,
  validateRateLimitKey,
  validateTierChangeData,
  validateRateLimitStatusQuery,
  validateTierHistoryQuery,
  isValidUserId,
  isValidWalletAddress,
  sanitizeTierChangeData,
  validateAndSanitizeKey,
  createValidationErrorResponse
};
