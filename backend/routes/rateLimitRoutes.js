const express = require('express');
const router = express.Router();
const {
  getRateLimitStatus,
  resetRateLimit,
  getGlobalStats,
  cleanupExpiredRecords,
  updateUserTier,
  generateKey,
  resolveUserTier
} = require('../services/rateLimitService');
const { getAllTiers, getEndpointOverrides, isValidTier, compareTiers } = require('../utils/rateLimitUtils');
const { TIER_LEVELS } = require('../config/rateLimitConfig');

/**
 * Rate Limit Routes
 * 
 * API endpoints for managing and querying rate limit status.
 * 
 * @module routes/rateLimitRoutes
 */

/**
 * GET /api/rate-limit/status
 * Get the current user's rate limit status
 */
router.get('/status', async (req, res) => {
  try {
    const key = generateKey(req);
    const tier = resolveUserTier(req);
    const endpoint = req.query.endpoint || '/api';

    const status = await getRateLimitStatus(key, tier, endpoint);

    res.json({
      success: true,
      data: {
        key: key.replace(/:.+/, ':***'), // Mask the key for security
        ...status
      }
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/tiers
 * Get all available rate limit tiers and their configurations
 */
router.get('/tiers', (req, res) => {
  try {
    const tiers = getAllTiers();
    res.json({
      success: true,
      data: {
        tiers,
        totalTiers: tiers.length
      }
    });
  } catch (error) {
    console.error('Error getting tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tier configurations',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/tiers/compare
 * Compare two tiers side by side
 */
router.get('/tiers/compare', (req, res) => {
  try {
    const { tierA, tierB } = req.query;

    if (!tierA || !tierB) {
      return res.status(400).json({
        success: false,
        error: 'Both tierA and tierB query parameters are required'
      });
    }

    if (!isValidTier(tierA) || !isValidTier(tierB)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier name provided',
        validTiers: Object.values(TIER_LEVELS)
      });
    }

    const comparison = compareTiers(tierA, tierB);
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare tiers',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/endpoints
 * Get endpoint-specific rate limit overrides
 */
router.get('/endpoints', (req, res) => {
  try {
    const overrides = getEndpointOverrides();
    res.json({
      success: true,
      data: {
        overrides,
        totalOverrides: overrides.length
      }
    });
  } catch (error) {
    console.error('Error getting endpoint overrides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get endpoint overrides',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/stats
 * Get global rate limit statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting rate limit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/rate-limit/reset
 * Reset rate limits for a specific key (admin only)
 */
router.post('/reset', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Rate limit key is required'
      });
    }

    const success = await resetRateLimit(key);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Rate limit record not found for the given key'
      });
    }

    res.json({
      success: true,
      message: 'Rate limits reset successfully',
      key: key.replace(/:.+/, ':***')
    });
  } catch (error) {
    console.error('Error resetting rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limits',
      message: error.message
    });
  }
});

/**
 * POST /api/rate-limit/cleanup
 * Clean up expired rate limit records (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await cleanupExpiredRecords();
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired rate limit records`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up rate limit records',
      message: error.message
    });
  }
});

/**
 * PUT /api/rate-limit/tier
 * Update a user's rate limit tier (admin only)
 */
router.put('/tier', async (req, res) => {
  try {
    const { key, tier } = req.body;

    if (!key || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Both key and tier are required'
      });
    }

    if (!isValidTier(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier name',
        validTiers: Object.values(TIER_LEVELS)
      });
    }

    const success = await updateUserTier(key, tier);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Rate limit record not found for the given key'
      });
    }

    res.json({
      success: true,
      message: `Tier updated to ${tier}`,
      key: key.replace(/:.+/, ':***'),
      tier
    });
  } catch (error) {
    console.error('Error updating tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tier',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/health
 * Health check for the rate limiting system
 */
router.get('/health', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json({
      success: true,
      data: {
        status: 'healthy',
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;
