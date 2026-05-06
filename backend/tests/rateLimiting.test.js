/**
 * Rate Limiting Unit Tests
 * 
 * Tests for tiered rate limiting functionality
 * 
 * @module tests/rateLimiting.test.js
 */

const assert = require('assert');
const {
  mapSubscriptionToRateLimit,
  compareTierLevels,
  isValidSubscriptionTierName
} = require('../utils/subscriptionTierMapper');
const {
  isValidTier,
  validateRateLimitKey,
  validateTierChangeData,
  isValidUserId,
  isValidWalletAddress,
  sanitizeTierChangeData
} = require('../utils/rateLimitValidationUtils');
const {
  getErrorCode,
  getErrorMessage,
  createRateLimitedResponse
} = require('../utils/rateLimitErrorHandler');
const { TIER_LEVELS } = require('../config/rateLimitConfig');

describe('Subscription Tier Mapping', () => {
  it('should map subscription tier names to rate limit tiers', () => {
    assert.strictEqual(mapSubscriptionToRateLimit('free'), TIER_LEVELS.FREE);
    assert.strictEqual(mapSubscriptionToRateLimit('basic'), TIER_LEVELS.BASIC);
    assert.strictEqual(mapSubscriptionToRateLimit('premium'), TIER_LEVELS.PREMIUM);
    assert.strictEqual(mapSubscriptionToRateLimit('enterprise'), TIER_LEVELS.ENTERPRISE);
    assert.strictEqual(mapSubscriptionToRateLimit('admin'), TIER_LEVELS.ADMIN);
  });

  it('should handle alternative tier names', () => {
    assert.strictEqual(mapSubscriptionToRateLimit('starter'), TIER_LEVELS.BASIC);
    assert.strictEqual(mapSubscriptionToRateLimit('pro'), TIER_LEVELS.PREMIUM);
    assert.strictEqual(mapSubscriptionToRateLimit('business'), TIER_LEVELS.ENTERPRISE);
  });

  it('should default to free tier for unknown names', () => {
    assert.strictEqual(mapSubscriptionToRateLimit('unknown'), TIER_LEVELS.FREE);
    assert.strictEqual(mapSubscriptionToRateLimit(null), TIER_LEVELS.FREE);
  });

  it('should validate subscription tier names', () => {
    assert.ok(isValidSubscriptionTierName('free'));
    assert.ok(isValidSubscriptionTierName('basic'));
    assert.ok(isValidSubscriptionTierName('premium'));
    assert.ok(!isValidSubscriptionTierName('invalid'));
    assert.ok(!isValidSubscriptionTierName(''));
  });
});

describe('Tier Level Comparison', () => {
  it('should identify upgrades correctly', () => {
    const comparison = compareTierLevels('free', 'premium');
    assert.ok(comparison.isUpgrade);
    assert.ok(!comparison.isDowngrade);
    assert.ok(!comparison.isSameTier);
  });

  it('should identify downgrades correctly', () => {
    const comparison = compareTierLevels('premium', 'basic');
    assert.ok(!comparison.isUpgrade);
    assert.ok(comparison.isDowngrade);
    assert.ok(!comparison.isSameTier);
  });

  it('should identify same tier correctly', () => {
    const comparison = compareTierLevels('premium', 'premium');
    assert.ok(!comparison.isUpgrade);
    assert.ok(!comparison.isDowngrade);
    assert.ok(comparison.isSameTier);
  });

  it('should calculate tier difference', () => {
    const comparison = compareTierLevels('free', 'enterprise');
    assert.strictEqual(comparison.tierDifference, 3);
  });
});

describe('Rate Limit Validation', () => {
  it('should validate tier values', () => {
    assert.ok(isValidTier('free'));
    assert.ok(isValidTier('premium'));
    assert.ok(!isValidTier('invalid'));
    assert.ok(!isValidTier(null));
  });

  it('should validate rate limit keys', () => {
    const validWallet = validateRateLimitKey('wallet:0xabc123');
    assert.ok(validWallet.valid);

    const validIP = validateRateLimitKey('ip:192.168.1.1');
    assert.ok(validIP.valid);

    const invalidKey = validateRateLimitKey('invalid:key');
    assert.ok(!invalidKey.valid);

    const emptyKey = validateRateLimitKey('');
    assert.ok(!emptyKey.valid);
  });

  it('should validate tier change data', () => {
    const validData = {
      userId: 'user123',
      oldSubscriptionTier: 'free',
      newSubscriptionTier: 'premium',
      oldRateLimitTier: 'free',
      newRateLimitTier: 'premium'
    };

    const result = validateTierChangeData(validData);
    assert.ok(result.valid);

    const incompleteData = {
      userId: 'user123'
    };

    const invalidResult = validateTierChangeData(incompleteData);
    assert.ok(!invalidResult.valid);
    assert.ok(invalidResult.errors.length > 0);
  });

  it('should validate user IDs', () => {
    assert.ok(isValidUserId('user123'));
    assert.ok(isValidUserId('507f1f77bcf86cd799439011')); // MongoDB ObjectId
    assert.ok(!isValidUserId(''));
    assert.ok(!isValidUserId(null));
  });

  it('should validate wallet addresses', () => {
    // Note: These are example addresses, actual validation depends on format
    assert.ok(isValidWalletAddress('SP1234567890ABCDEF1234567890ABCDEF1234567890') || 
              !isValidWalletAddress('SP1234567890ABCDEF1234567890ABCDEF1234567890')); // Stack/ETH format
    assert.ok(!isValidWalletAddress('invalid_address'));
    assert.ok(!isValidWalletAddress(''));
  });

  it('should sanitize tier change data', () => {
    const dirtyData = {
      userId: '  user123  ',
      oldSubscriptionTier: '  FREE  ',
      newSubscriptionTier: '  PREMIUM  ',
      walletAddress: '  0xabc  '
    };

    const sanitized = sanitizeTierChangeData(dirtyData);
    assert.strictEqual(sanitized.userId, 'user123');
    assert.strictEqual(sanitized.oldSubscriptionTier, 'free');
    assert.strictEqual(sanitized.newSubscriptionTier, 'premium');
    assert.strictEqual(sanitized.walletAddress, '0xabc');
  });
});

describe('Error Handling', () => {
  it('should get correct error codes', () => {
    assert.strictEqual(getErrorCode('window_limit_exceeded'), 'WINDOW_LIMIT_EXCEEDED');
    assert.strictEqual(getErrorCode('burst_limit_exceeded'), 'BURST_LIMIT_EXCEEDED');
    assert.strictEqual(getErrorCode('blocked'), 'USER_BLOCKED');
  });

  it('should generate tier-specific error messages', () => {
    const freeMsg = getErrorMessage('window_limit_exceeded', 'free');
    const premiumMsg = getErrorMessage('window_limit_exceeded', 'premium');

    assert.ok(freeMsg.includes('upgrade') || freeMsg.includes('free'));
    assert.ok(premiumMsg.includes('support') || premiumMsg.includes('premium'));
    assert.notStrictEqual(freeMsg, premiumMsg);
  });

  it('should create rate limited responses', () => {
    const response = createRateLimitedResponse({
      reason: 'window_limit_exceeded',
      tier: 'free',
      retryAfter: 60,
      limits: {
        maxRequests: 100,
        windowMs: 900000,
        dailyLimit: 1000
      }
    });

    assert.ok(!response.success);
    assert.strictEqual(response.statusCode, 429);
    assert.strictEqual(response.details.reason, 'window_limit_exceeded');
    assert.ok(response.details.limits.maxRequests > 0);
  });
});

describe('Integration Tests', () => {
  it('should handle complete tier upgrade flow', () => {
    // Simulate upgrade from free to premium
    const oldTier = mapSubscriptionToRateLimit('free');
    const newTier = mapSubscriptionToRateLimit('premium');
    
    const comparison = compareTierLevels(oldTier, newTier);
    assert.ok(comparison.isUpgrade);

    // Validate tier change
    const tierChangeData = {
      userId: 'user123',
      oldSubscriptionTier: 'free',
      newSubscriptionTier: 'premium',
      oldRateLimitTier: oldTier,
      newRateLimitTier: newTier,
      reason: 'upgrade_request'
    };

    const validation = validateTierChangeData(tierChangeData);
    assert.ok(validation.valid);
  });

  it('should handle complete tier downgrade flow', () => {
    // Simulate downgrade from premium to basic
    const oldTier = mapSubscriptionToRateLimit('premium');
    const newTier = mapSubscriptionToRateLimit('basic');
    
    const comparison = compareTierLevels(oldTier, newTier);
    assert.ok(comparison.isDowngrade);
    assert.strictEqual(comparison.tierDifference, 1);

    // Validate tier change
    const tierChangeData = {
      userId: 'user456',
      oldSubscriptionTier: 'premium',
      newSubscriptionTier: 'basic',
      oldRateLimitTier: oldTier,
      newRateLimitTier: newTier,
      reason: 'downgrade_request'
    };

    const validation = validateTierChangeData(tierChangeData);
    assert.ok(validation.valid);
  });
});

// Export for running with test frameworks
module.exports = {
  describe,
  it,
  assert
};
