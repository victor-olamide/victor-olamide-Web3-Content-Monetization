/**
 * Pinning Management Routes
 * API endpoints for managing IPFS pinning operations
 */

const express = require('express');
const router = express.Router();
const { pinningService } = require('../services/pinningService');
const { pinningManager } = require('../services/pinningManager');
const Content = require('../models/Content');
const ContentPreview = require('../models/ContentPreview');
const auth = require('../middleware/adminAuth');

// Apply admin authentication to all routes
router.use(auth);

/**
 * GET /api/pinning/status
 * Get overall pinning service status
 */
router.get('/status', async (req, res) => {
  try {
    const serviceStatus = pinningManager.getStatus();
    const stats = await pinningManager.getPinningStats();

    res.json({
      success: true,
      data: {
        service: serviceStatus,
        stats
      }
    });
  } catch (error) {
    console.error('Error getting pinning status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pinning status',
      details: error.message
    });
  }
});

/**
 * GET /api/pinning/health
 * Get pinning service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = pinningService.getHealthStatus();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting pinning health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pinning health',
      details: error.message
    });
  }
});

/**
 * GET /api/pinning/storage
 * Get storage usage across providers
 */
router.get('/storage', async (req, res) => {
  try {
    const usage = await pinningService.getStorageUsage();

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Error getting storage usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage usage',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/content/:contentId/pin
 * Pin specific content
 */
router.post('/content/:contentId/pin', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { redundancy } = req.body;

    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    if (!content.url || !content.url.startsWith('ipfs://')) {
      return res.status(400).json({
        success: false,
        error: 'Content does not have an IPFS URL'
      });
    }

    const result = await pinningService.pinExistingHash(content.url, {
      redundancy: redundancy || pinningManager.redundancyLevel
    });

    // Update content with pinning info
    await pinningManager.updateContentPinningInfo(content._id, result);

    res.json({
      success: true,
      data: result,
      message: `Successfully pinned content ${contentId}`
    });

  } catch (error) {
    console.error('Error pinning content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pin content',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/content/:contentId/unpin
 * Unpin specific content
 */
router.post('/content/:contentId/unpin', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { providers } = req.body; // Optional: specific providers to unpin from

    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const result = await pinningService.unpinHash(content.url, providers);

    // Update content with unpinning info
    await Content.findByIdAndUpdate(content._id, {
      'pinningInfo.unpinnedAt': new Date(),
      'pinningInfo.unpinningResults': result.unpinned
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully unpinned content ${contentId}`
    });

  } catch (error) {
    console.error('Error unpinning content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unpin content',
      details: error.message
    });
  }
});

/**
 * GET /api/pinning/content/:contentId/status
 * Check pinning status of specific content
 */
router.get('/content/:contentId/status', async (req, res) => {
  try {
    const { contentId } = req.params;

    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    if (!content.url || !content.url.startsWith('ipfs://')) {
      return res.json({
        success: true,
        data: {
          hash: null,
          status: {},
          summary: {
            isWellPinned: false,
            message: 'Content does not have an IPFS URL'
          }
        }
      });
    }

    const status = await pinningService.checkPinningStatus(content.url);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error checking content pinning status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check pinning status',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/content/:contentId/repair
 * Repair pinning for specific content
 */
router.post('/content/:contentId/repair', async (req, res) => {
  try {
    const { contentId } = req.params;

    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const result = await pinningManager.repairContentPinning(content);

    res.json({
      success: true,
      data: result,
      message: result.repaired
        ? `Successfully repaired pinning for content ${contentId}`
        : `Content ${contentId} is already well pinned`
    });

  } catch (error) {
    console.error('Error repairing content pinning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to repair content pinning',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/health-check
 * Manually trigger health check
 */
router.post('/health-check', async (req, res) => {
  try {
    await pinningManager.performHealthCheck();

    res.json({
      success: true,
      message: 'Health check completed successfully'
    });

  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check',
      details: error.message
    });
  }
});

/**
 * GET /api/pinning/content
 * Get list of pinned content with status
 */
router.get('/content', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status, // 'pinned', 'unpinned', 'needs-repair'
      contentType
    } = req.query;

    const query = {};

    // Filter by pinning status
    if (status === 'pinned') {
      query['pinningInfo.replicas'] = { $exists: true };
      query['pinningInfo.unpinnedAt'] = { $exists: false };
    } else if (status === 'unpinned') {
      query['pinningInfo.unpinnedAt'] = { $exists: true };
    }

    // Filter by content type
    if (contentType) {
      query.contentType = contentType;
    }

    const contents = await Content.find(query)
      .select('contentId title contentType url pinningInfo createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get pinning status for each content
    const contentWithStatus = await Promise.all(
      contents.map(async (content) => {
        let pinningStatus = null;

        if (content.url && content.url.startsWith('ipfs://')) {
          try {
            pinningStatus = await pinningService.checkPinningStatus(content.url);
          } catch (error) {
            console.error(`Error checking status for content ${content.contentId}:`, error.message);
          }
        }

        return {
          ...content.toObject(),
          currentPinningStatus: pinningStatus
        };
      })
    );

    const total = await Content.countDocuments(query);

    res.json({
      success: true,
      data: {
        contents: contentWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting pinned content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pinned content',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/emergency/unpin-all
 * Emergency unpin all content (dangerous operation)
 */
router.post('/emergency/unpin-all', async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (!confirmation || confirmation !== 'CONFIRM_UNPIN_ALL') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. This will unpin ALL content.',
        requiredConfirmation: 'CONFIRM_UNPIN_ALL'
      });
    }

    const result = await pinningManager.emergencyUnpinAll(confirmation);

    res.json({
      success: true,
      data: result,
      message: 'Emergency unpin completed'
    });

  } catch (error) {
    console.error('Error performing emergency unpin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform emergency unpin',
      details: error.message
    });
  }
});

/**
 * POST /api/pinning/preview/:previewId/pin
 * Pin content preview (thumbnail/trailer)
 */
router.post('/preview/:previewId/pin', async (req, res) => {
  try {
    const { previewId } = req.params;

    const preview = await ContentPreview.findById(previewId);

    if (!preview) {
      return res.status(404).json({
        success: false,
        error: 'Preview not found'
      });
    }

    // This endpoint assumes the preview already has IPFS URLs
    // In practice, this would be called after the preview files are uploaded
    const result = {
      message: 'Preview pinning should be handled during upload',
      previewId
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error pinning preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pin preview',
      details: error.message
    });
  }
});

module.exports = router;