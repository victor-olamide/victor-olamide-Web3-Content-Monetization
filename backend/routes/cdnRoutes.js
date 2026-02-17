const express = require('express');
const router = express.Router();
const cdnService = require('../services/cdnService');
const cdnDeliveryService = require('../services/cdnDeliveryService');
const { CdnCacheEntry, CdnPurgeRequest, CdnAnalytics, CdnHealthCheck } = require('../models/CdnCache');
const Content = require('../models/Content');

// Middleware to check admin access (simplified)
const requireAdminAccess = (req, res, next) => {
  // In production, implement proper admin authentication
  next();
};

/**
 * @route GET /api/cdn/status
 * @desc Get CDN system status and health
 * @access Private (Admin)
 */
router.get('/status', requireAdminAccess, async (req, res) => {
  try {
    const health = await cdnDeliveryService.checkCdnHealth();
    const stats = await cdnDeliveryService.getDeliveryStats(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    );

    // Get cache statistics
    const cacheStats = await CdnCacheEntry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBytes: { $sum: '$bytesServed' },
          totalHits: { $sum: '$hitCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        health,
        stats: stats.success ? stats.stats : null,
        cacheStats,
        config: {
          enabled: require('../config/cdnConfig').cdnConfig.enabled,
          provider: require('../config/cdnConfig').cdnConfig.provider
        }
      }
    });
  } catch (error) {
    console.error('Failed to get CDN status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN status'
    });
  }
});

/**
 * @route POST /api/cdn/cache/:contentId
 * @desc Add content to CDN cache
 * @access Private (Admin)
 */
router.post('/cache/:contentId', requireAdminAccess, async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const result = await cdnService.addToCache(content);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to add content to CDN cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add content to CDN cache'
    });
  }
});

/**
 * @route DELETE /api/cdn/cache/:contentId
 * @desc Remove content from CDN cache
 * @access Private (Admin)
 */
router.delete('/cache/:contentId', requireAdminAccess, async (req, res) => {
  try {
    const { contentId } = req.params;
    const result = await cdnService.purgeContent([parseInt(contentId)], 'manual');

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to purge CDN cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purge CDN cache'
    });
  }
});

/**
 * @route POST /api/cdn/purge
 * @desc Purge multiple content items from CDN cache
 * @access Private (Admin)
 */
router.post('/purge', requireAdminAccess, async (req, res) => {
  try {
    const { contentIds, reason = 'manual' } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contentIds must be a non-empty array'
      });
    }

    const result = await cdnService.purgeContent(contentIds, reason);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to purge CDN content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purge CDN content'
    });
  }
});

/**
 * @route POST /api/cdn/warmup
 * @desc Warm up CDN cache for multiple content items
 * @access Private (Admin)
 */
router.post('/warmup', requireAdminAccess, async (req, res) => {
  try {
    const { contentIds, limit = 50 } = req.body;

    let contents;
    if (contentIds && Array.isArray(contentIds)) {
      contents = await Content.find({
        contentId: { $in: contentIds },
        isRemoved: false
      }).limit(limit);
    } else {
      // Warm up recently accessed content
      contents = await Content.find({
        isRemoved: false
      }).sort({ createdAt: -1 }).limit(limit);
    }

    const result = await cdnDeliveryService.warmupCache(contents);

    res.json({
      success: true,
      data: {
        requested: contentIds ? contentIds.length : limit,
        processed: contents.length,
        result
      }
    });
  } catch (error) {
    console.error('Failed to warmup CDN cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warmup CDN cache'
    });
  }
});

/**
 * @route GET /api/cdn/cache
 * @desc Get CDN cache entries with pagination
 * @access Private (Admin)
 */
router.get('/cache', requireAdminAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // 'cached', 'purged', 'pending', 'failed'
    const contentType = req.query.contentType;

    const query = {};
    if (status) query.status = status;
    if (contentType) query.contentType = contentType;

    const total = await CdnCacheEntry.countDocuments(query);
    const cacheEntries = await CdnCacheEntry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('contentId', 'title creator')
      .select('-__v');

    res.json({
      success: true,
      data: {
        cacheEntries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Failed to get CDN cache entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN cache entries'
    });
  }
});

/**
 * @route GET /api/cdn/purges
 * @desc Get CDN purge requests history
 * @access Private (Admin)
 */
router.get('/purges', requireAdminAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = {};
    if (status) query.status = status;

    const total = await CdnPurgeRequest.countDocuments(query);
    const purges = await CdnPurgeRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    res.json({
      success: true,
      data: {
        purges,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Failed to get CDN purge requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN purge requests'
    });
  }
});

/**
 * @route GET /api/cdn/analytics
 * @desc Get CDN analytics data
 * @access Private (Admin)
 */
router.get('/analytics', requireAdminAccess, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const days = parseInt(req.query.days) || 7;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const result = await cdnService.getAnalytics(period, startDate, endDate);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Failed to get CDN analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN analytics'
    });
  }
});

/**
 * @route GET /api/cdn/health
 * @desc Get CDN health check results
 * @access Private (Admin)
 */
router.get('/health', requireAdminAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const healthChecks = await CdnHealthCheck.find()
      .sort({ checkedAt: -1 })
      .limit(limit)
      .select('-__v');

    const latestHealth = await cdnDeliveryService.checkCdnHealth();

    res.json({
      success: true,
      data: {
        latest: latestHealth,
        history: healthChecks
      }
    });
  } catch (error) {
    console.error('Failed to get CDN health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN health'
    });
  }
});

/**
 * @route POST /api/cdn/health/check
 * @desc Perform manual CDN health check
 * @access Private (Admin)
 */
router.post('/health/check', requireAdminAccess, async (req, res) => {
  try {
    const result = await cdnDeliveryService.checkCdnHealth();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to perform CDN health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform CDN health check'
    });
  }
});

/**
 * @route GET /api/cdn/config
 * @desc Get CDN configuration (without sensitive data)
 * @access Private (Admin)
 */
router.get('/config', requireAdminAccess, async (req, res) => {
  try {
    const { cdnConfig, validateCdnConfig } = require('../config/cdnConfig');

    // Remove sensitive information
    const safeConfig = JSON.parse(JSON.stringify(cdnConfig));
    delete safeConfig.providers;

    const validation = validateCdnConfig();

    res.json({
      success: true,
      data: {
        config: safeConfig,
        validation
      }
    });
  } catch (error) {
    console.error('Failed to get CDN config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN config'
    });
  }
});

module.exports = router;