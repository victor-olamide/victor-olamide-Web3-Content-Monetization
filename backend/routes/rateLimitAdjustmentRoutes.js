/**
 * Rate Limit Adjustment Routes
 * 
 * API endpoints for managing tiered rate limiting,
 * checking limits, and adjusting per-user limits.
 * 
 * @module routes/rateLimitAdjustmentRoutes
 */

const express = require('express');
const router = express.Router();
const {
  getRateLimitStatus,
  resetRateLimit,
  updateUserTier
} = require('../services/rateLimitService');
const {
  getUserRateLimitTier,
  hasMinimumTier,
  compareTierLevels
} = require('../utils/subscriptionTierMapper');
const {
  invalidateUserTier
} = require('../services/tierCacheService');
const {
  handleTierChange,
  getUserTierChangeHistory,
  validateTierTransition
} = require('../services/tierChangeHandler');
const TierChangeLog = require('../models/TierChangeLog');
const { TIER_LEVELS } = require('../config/rateLimitConfig');

/**
 * GET /api/rate-limits/user-tier
 * Get current user's rate limit tier
 */
router.get('/user-tier', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(400).json({
        error: 'User ID required',
        message: 'Please provide a valid user ID'
      });
    }

    const tier = await getUserRateLimitTier(userId);

    res.json({
      success: true,
      userId,
      rateLimitTier: tier
    });
  } catch (error) {
    console.error('Error getting user tier:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user tier'
    });
  }
});

/**
 * GET /api/rate-limits/status
 * Get rate limit status for a specific key
 */
router.get('/status', async (req, res) => {
  try {
    const { key, endpoint = '/api' } = req.query;

    if (!key) {
      return res.status(400).json({
        error: 'Missing key',
        message: 'Rate limit key is required'
      });
    }

    // Extract tier from key or get from database
    const userData = key.split(':');
    const userIdOrAddress = userData[1];
    let tier = TIER_LEVELS.FREE;

    if (userData[0] === 'wallet' && userIdOrAddress) {
      tier = await getUserRateLimitTier(userIdOrAddress);
    }

    const status = await getRateLimitStatus(key, tier, endpoint);

    res.json({
      success: true,
      key,
      status
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status'
    });
  }
});

/**
 * POST /api/rate-limits/reset
 * Reset rate limits for a user (admin only)
 */
router.post('/reset', async (req, res) => {
  try {
    const { key, userId } = req.body;

    if (!key && !userId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Either key or userId is required'
      });
    }

    const resetKey = key || `wallet:${userId}`;
    const success = await resetRateLimit(resetKey);

    if (success) {
      // Also invalidate cache
      if (userId) {
        invalidateUserTier(userId);
      }
    }

    res.json({
      success,
      message: success ? 'Rate limits reset' : 'Failed to reset rate limits',
      key: resetKey
    });
  } catch (error) {
    console.error('Error resetting rate limits:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limits'
    });
  }
});

/**
 * POST /api/rate-limits/tier-change
 * Record a tier change for a user
 */
router.post('/tier-change', async (req, res) => {
  try {
    const {
      userId,
      walletAddress,
      oldSubscriptionTier,
      newSubscriptionTier,
      oldRateLimitTier,
      newRateLimitTier,
      creatorId,
      reason,
      metadata
    } = req.body;

    // Validate required fields
    const required = ['userId', 'oldSubscriptionTier', 'newSubscriptionTier', 'oldRateLimitTier', 'newRateLimitTier'];
    const missing = required.filter(field => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing
      });
    }

    // Validate tier transition
    const validation = validateTierTransition(oldRateLimitTier, newRateLimitTier);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid tier transition',
        message: validation.reason
      });
    }

    // Handle the tier change
    const result = await handleTierChange({
      userId,
      walletAddress,
      oldSubscriptionTier,
      newSubscriptionTier,
      oldRateLimitTier,
      newRateLimitTier,
      creatorId,
      reason: reason || 'subscription_change',
      metadata: metadata || {}
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message,
      changeLogId: result.changeLogId,
      isUpgrade: result.isUpgrade,
      isDowngrade: result.isDowngrade
    });
  } catch (error) {
    console.error('Error handling tier change:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to record tier change'
    });
  }
});

/**
 * GET /api/rate-limits/tier-history
 * Get tier change history for a user
 */
router.get('/tier-history', async (req, res) => {
  try {
    const { userId, limit = 50, offset = 0, creatorId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required',
        message: 'Please provide a valid user ID'
      });
    }

    const history = await getUserTierChangeHistory(userId, {
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      creatorId
    });

    res.json({
      success: true,
      userId,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Error getting tier history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get tier history'
    });
  }
});

/**
 * GET /api/rate-limits/tier-statistics
 * Get global tier change statistics
 */
router.get('/tier-statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await TierChangeLog.getGlobalStats({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * GET /api/rate-limits/tier-comparison
 * Compare two tier levels
 */
router.get('/tier-comparison', async (req, res) => {
  try {
    const { tier1, tier2 } = req.query;

    if (!tier1 || !tier2) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Both tier1 and tier2 query parameters are required'
      });
    }

    const comparison = compareTierLevels(tier1, tier2);

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Error comparing tiers:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to compare tiers'
    });
  }
});

/**
 * GET /api/rate-limits/check-tier
 * Check if user has minimum required tier
 */
router.get('/check-tier', async (req, res) => {
  try {
    const { userId, requiredTier } = req.query;

    if (!userId || !requiredTier) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Both userId and requiredTier are required'
      });
    }

    const hasTier = await hasMinimumTier(userId, requiredTier);
    const currentTier = await getUserRateLimitTier(userId);

    res.json({
      success: true,
      userId,
      currentTier,
      requiredTier,
      meetsRequirement: hasTier
    });
  } catch (error) {
    console.error('Error checking tier:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check tier'
    });
  }
});

/**
 * GET /api/rate-limits/available-tiers
 * Get list of all available tiers
 */
router.get('/available-tiers', (req, res) => {
  try {
    const tiers = Object.values(TIER_LEVELS);

    res.json({
      success: true,
      tiers,
      count: tiers.length
    });
  } catch (error) {
    console.error('Error getting available tiers:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get available tiers'
    });
  }
});

module.exports = router;
