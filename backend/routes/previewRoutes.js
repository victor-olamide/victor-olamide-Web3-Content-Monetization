const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const previewService = require('../services/previewService');
const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const { verifyCreatorOwnership } = require('../middleware/creatorAuth');
const { uploadFileToIPFS } = require('../services/ipfsService');
const { toGatewayUrl } = require('../utils/previewUtils');
const {
  validateContentId,
  validatePreviewData,
  validateBatchContentIds,
  validateEventType,
  validatePaginationParams,
  validateContentType
} = require('../middleware/previewValidation');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for video files
  }
});

/**
 * Serve generated preview asset without any access check (public).
 * Returns the previewCid and a gateway URL so the client can stream directly.
 * GET /api/preview/:contentId/serve
 */
router.get('/:contentId/serve', validateContentId, async (req, res) => {
  try {
    const { contentId } = req.params;
    const preview = await ContentPreview.findOne(
      { contentId: parseInt(contentId), previewEnabled: true },
      'contentId contentType previewCid trailerUrl previewImageUrl trailerDuration'
    );

    if (!preview || !preview.previewCid) {
      return res.status(404).json({
        success: false,
        error: 'No generated preview available for this content'
      });
    }

    const gatewayUrl = toGatewayUrl(`ipfs://${preview.previewCid}`);
    return res.json({
      success: true,
      data: {
        contentId: preview.contentId,
        contentType: preview.contentType,
        previewCid: preview.previewCid,
        gatewayUrl,
        trailerDuration: preview.trailerDuration || null,
      }
    });
  } catch (error) {
    logger.error('Error serving preview', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate a free preview for content (creator only).
 * Accepts the full content file, generates the preview slice, uploads to IPFS,
 * and stores the separate preview CID on the ContentPreview record.
 * POST /api/preview/:contentId/generate
 */
router.post('/:contentId/generate', verifyCreatorOwnership, validateContentId, async (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message });
    }

    try {
      const { contentId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const content = await Content.findOne({ contentId: parseInt(contentId) });
      if (!content || content.creator !== req.user.address) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const mimeType = req.file.mimetype;
      const totalSeconds = req.body.totalSeconds ? parseFloat(req.body.totalSeconds) : 0;

      const preview = await previewService.generateAndStorePreview(
        parseInt(contentId),
        req.file.buffer,
        mimeType,
        { totalSeconds }
      );

      res.json({
        success: true,
        data: {
          contentId: preview.contentId,
          previewCid: preview.previewCid,
          trailerUrl: preview.trailerUrl,
          previewImageUrl: preview.previewImageUrl,
          trailerDuration: preview.trailerDuration,
        },
        message: 'Preview generated and stored successfully'
      });
    } catch (error) {
      logger.error('Error generating preview', { err: error });
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * Look up a preview record by its dedicated IPFS CID (public, no access check).
 * GET /api/preview/cid/:cid
 */
router.get('/cid/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    if (!cid || cid.length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid CID' });
    }

    const preview = await previewService.getPreviewByCid(cid);
    if (!preview) {
      return res.status(404).json({ success: false, error: 'Preview not found for CID' });
    }

    return res.json({
      success: true,
      data: {
        contentId: preview.contentId,
        contentType: preview.contentType,
        previewCid: preview.previewCid,
        gatewayUrl: toGatewayUrl(`ipfs://${preview.previewCid}`),
        trailerDuration: preview.trailerDuration || null,
      }
    });
  } catch (error) {
    logger.error('Error fetching preview by CID', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get preview for specific content (public)
 * GET /api/preview/:contentId
 */
router.get('/:contentId', validateContentId, async (req, res) => {
  try {
    const { contentId } = req.params;
    const preview = await previewService.getPreview(parseInt(contentId));
    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error fetching preview', { err: error });
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * Get previews for multiple content items
 * POST /api/preview/batch/get
 */
router.post('/batch/get', validateBatchContentIds, async (req, res) => {
  try {
    const { contentIds } = req.body;
    if (!Array.isArray(contentIds)) {
      return res.status(400).json({ success: false, error: 'contentIds must be an array' });
    }

    const previews = await previewService.getPreviews(contentIds);
    res.json({ success: true, data: previews });
  } catch (error) {
    logger.error('Error fetching batch previews', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get previews by content type
 * GET /api/preview/type/:contentType
 */
router.get('/type/:contentType', validateContentType, validatePaginationParams, async (req, res) => {
  try {
    const { contentType } = req.params;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const result = await previewService.getPreviewsByType(contentType, { skip, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching previews by type', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get trending previews
 * GET /api/preview/trending
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;

    const previews = await previewService.getTrendingPreviews({ limit, days });
    res.json({ success: true, data: previews });
  } catch (error) {
    logger.error('Error fetching trending previews', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Check user access status for content
 * GET /api/preview/:contentId/access/:userAddress
 */
router.get('/:contentId/access/:userAddress', validateContentId, async (req, res) => {
  try {
    const { contentId, userAddress } = req.params;
    const accessStatus = await previewService.checkAccessStatus(
      parseInt(contentId),
      userAddress
    );
    res.json({ success: true, data: accessStatus });
  } catch (error) {
    logger.error('Error checking access status', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Record preview download
 * POST /api/preview/:contentId/download
 */
router.post('/:contentId/download', validateContentId, async (req, res) => {
  try {
    const { contentId } = req.params;
    const preview = await previewService.recordPreviewDownload(parseInt(contentId));
    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error recording preview download', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create or update content preview (creator only)
 * POST /api/preview/:contentId
 */
router.post('/:contentId', verifyCreatorOwnership, validateContentId, validatePreviewData, async (req, res) => {
  try {
    const { contentId } = req.params;
    const previewData = req.body;

    // Verify content exists and belongs to creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content || content.creator !== req.user.address) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const preview = await previewService.createOrUpdatePreview(
      parseInt(contentId),
      previewData
    );

    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error creating preview', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Upload thumbnail for content
 * POST /api/preview/:contentId/thumbnail
 */
router.post('/:contentId/thumbnail', verifyCreatorOwnership, async (req, res) => {
  upload.single('thumbnail')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { contentId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Verify content belongs to creator
      const content = await Content.findOne({ contentId: parseInt(contentId) });
      if (!content || content.creator !== req.user.address) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Upload to IPFS
      const ipfsHash = await uploadFileToIPFS(
        req.file.buffer,
        `thumbnail-${contentId}`,
        { type: 'thumbnail' }
      );

      // Update preview
      const preview = await previewService.createOrUpdatePreview(
        parseInt(contentId),
        {
          thumbnailUrl: ipfsHash,
          thumbnailStorageType: 'ipfs',
          thumbnailQuality: req.body.quality || 'high'
        }
      );

      res.json({
        success: true,
        data: preview,
        message: 'Thumbnail uploaded successfully'
      });
    } catch (error) {
      logger.error('Error uploading thumbnail', { err: error });
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * Upload trailer for content
 * POST /api/preview/:contentId/trailer
 */
router.post('/:contentId/trailer', verifyCreatorOwnership, async (req, res) => {
  upload.single('trailer')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { contentId } = req.params;
      const { duration, quality } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Verify content belongs to creator
      const content = await Content.findOne({ contentId: parseInt(contentId) });
      if (!content || content.creator !== req.user.address) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Upload to IPFS
      const ipfsHash = await uploadFileToIPFS(
        req.file.buffer,
        `trailer-${contentId}`,
        { type: 'trailer' }
      );

      // Update preview
      const preview = await previewService.createOrUpdatePreview(
        parseInt(contentId),
        {
          trailerUrl: ipfsHash,
          trailerStorageType: 'ipfs',
          trailerDuration: parseInt(duration) || 0,
          trailerSize: req.file.size,
          trailerQuality: quality || '720p'
        }
      );

      res.json({
        success: true,
        data: preview,
        message: 'Trailer uploaded successfully'
      });
    } catch (error) {
      logger.error('Error uploading trailer', { err: error });
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * Update preview text and images
 * PATCH /api/preview/:contentId/metadata
 */
router.patch('/:contentId/metadata', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { previewText, previewImageUrl } = req.body;

    // Verify content belongs to creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content || content.creator !== req.user.address) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const preview = await previewService.createOrUpdatePreview(
      parseInt(contentId),
      {
        previewText,
        previewImageUrl,
        updatedAt: new Date()
      }
    );

    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error updating preview metadata', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Toggle preview visibility
 * PATCH /api/preview/:contentId/visibility
 */
router.patch('/:contentId/visibility', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { enabled } = req.body;

    // Verify content belongs to creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content || content.creator !== req.user.address) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const preview = await previewService.togglePreviewVisibility(
      parseInt(contentId),
      enabled
    );

    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error toggling preview visibility', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get creator's preview statistics
 * GET /api/preview/stats/:creatorAddress
 */
router.get('/stats/:creatorAddress', async (req, res) => {
  try {
    const { creatorAddress } = req.params;
    const stats = await previewService.getPreviewStats(creatorAddress);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching preview stats', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete preview
 * DELETE /api/preview/:contentId
 */
router.delete('/:contentId', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;

    // Verify content belongs to creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content || content.creator !== req.user.address) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const result = await previewService.deletePreview(parseInt(contentId));
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error deleting preview', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get preview analytics
 * GET /api/preview/:contentId/analytics
 */
router.get('/:contentId/analytics', verifyCreatorOwnership, validateContentId, async (req, res) => {
  try {
    const { contentId } = req.params;
    
    // Verify content belongs to creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content || content.creator !== req.user.address) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const analytics = await previewService.getPreviewAnalytics(parseInt(contentId));
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Error fetching preview analytics', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get previews with analytics for multiple items
 * POST /api/preview/analytics/batch
 */
router.post('/analytics/batch', verifyCreatorOwnership, validateBatchContentIds, async (req, res) => {
  try {
    const { contentIds } = req.body;
    if (!contentIds || !Array.isArray(contentIds)) {
      return res.status(400).json({ success: false, error: 'contentIds must be an array' });
    }

    // Verify all content items belong to creator
    const contents = await Content.find({ contentId: { $in: contentIds } });
    for (const content of contents) {
      if (content.creator !== req.user.address) {
        return res.status(403).json({ success: false, error: 'Unauthorized - not all content belongs to you' });
      }
    }

    const analytics = await previewService.getPreviewsWithAnalytics(contentIds);
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Error fetching batch analytics', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Track preview engagement event
 * POST /api/preview/:contentId/track/:eventType
 */
router.post('/:contentId/track/:eventType', validateContentId, validateEventType, async (req, res) => {
  try {
    const { contentId, eventType } = req.params;
    
    if (!['view', 'download'].includes(eventType)) {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }

    await previewService.trackDailyAnalytics(parseInt(contentId), eventType);
    res.json({ success: true, message: `Event tracked: ${eventType}` });
  } catch (error) {
    logger.error('Error tracking event', { err: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
