/**
 * Moderation Routes
 * API endpoints for content moderation system
 */

const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const moderationService = require('../services/moderationService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  verifyModerator,
  verifyAdmin,
  verifyQueueAccess
} = require('../middleware/moderationAuth');
const {
  validateFlagSubmission,
  validateModerationDecision,
  validateQueueFilters
} = require('../middleware/contentFlagValidation');

// ===== Creator Routes (authenticated users) =====

/**
 * POST /api/moderation/flag
 * Submit a flag/report for content
 */
router.post('/flag', authenticateToken, validateFlagSubmission, moderationController.submitContentFlag);

// ===== Moderator Routes (require moderator authentication) =====

/**
 * GET /api/moderation/queue
 * Get moderation queue with filters and pagination
 */
router.get('/queue', authenticateToken, verifyModerator, validateQueueFilters, moderationController.getModerationQueue);

/**
 * GET /api/moderation/queue/:queueId
 * Get specific queue entry details
 */
router.get('/queue/:queueId', authenticateToken, verifyModerator, moderationController.getQueueEntry);

/**
 * POST /api/moderation/queue/:queueId/assign
 * Assign queue entry to moderator
 */
router.post('/queue/:queueId/assign', authenticateToken, verifyModerator, moderationController.assignQueueEntry);

/**
 * POST /api/moderation/queue/:queueId/approve
 * Approve content (resolve flags)
 */
router.post('/queue/:queueId/approve', authenticateToken, verifyModerator, validateModerationDecision, moderationController.approveQueueEntry);

/**
 * POST /api/moderation/queue/:queueId/reject
 * Reject/remove content
 */
router.post('/queue/:queueId/reject', authenticateToken, verifyModerator, validateModerationDecision, moderationController.rejectQueueEntry);

// ===== Admin Routes (require admin authentication) =====

/**
 * GET /api/moderation/stats
 * Get moderation statistics and metrics
 */
router.get('/stats', authenticateToken, requireAdmin, moderationController.getModerationStats);

/**
 * POST /api/moderation/content/:contentId/check
 * Manually run auto-flagging on content
 */
router.post('/content/:contentId/check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { contentId } = req.params;
    const Content = require('../models/Content');

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Run auto-filter
    const autoFilterResult = await moderationService.autoFilterContent(content);

    res.json({
      success: true,
      data: {
        contentId,
        analysis: autoFilterResult.analysis,
        assessment: autoFilterResult.assessment,
        flagged: autoFilterResult.flagged,
        shouldReview: autoFilterResult.shouldReview
      }
    });
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking content',
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/keywords/add
 * Add keyword to filter (admin only)
 */
router.post('/keywords/add', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, keyword } = req.body;

    if (!category || !keyword) {
      return res.status(400).json({
        success: false,
        message: 'category and keyword are required'
      });
    }

    const keywordFilterService = require('../services/keywordFilterService');
    keywordFilterService.addKeyword(category, keyword);

    res.json({
      success: true,
      message: `Keyword "${keyword}" added to category "${category}"`
    });
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding keyword',
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/keywords/remove
 * Remove keyword from filter (admin only)
 */
router.post('/keywords/remove', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, keyword } = req.body;

    if (!category || !keyword) {
      return res.status(400).json({
        success: false,
        message: 'category and keyword are required'
      });
    }

    const keywordFilterService = require('../services/keywordFilterService');
    keywordFilterService.removeKeyword(category, keyword);

    res.json({
      success: true,
      message: `Keyword "${keyword}" removed from category "${category}"`
    });
  } catch (error) {
    console.error('Error removing keyword:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing keyword',
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/keywords
 * Get all keywords by category (admin only)
 */
router.get('/keywords', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const keywordFilterService = require('../services/keywordFilterService');
    const keywords = keywordFilterService.getAllKeywords();

    res.json({
      success: true,
      data: {
        keywords,
        categories: keywordFilterService.getAllCategories()
      }
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching keywords',
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/keywords/:category
 * Get keywords for specific category (admin only)
 */
router.get('/keywords/:category', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const keywordFilterService = require('../services/keywordFilterService');
    const categoryKeywords = keywordFilterService.getKeywordsByCategory(category);

    if (!categoryKeywords) {
      return res.status(404).json({
        success: false,
        message: `Category "${category}" not found`
      });
    }

    res.json({
      success: true,
      data: categoryKeywords
    });
  } catch (error) {
    console.error('Error fetching category keywords:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category keywords',
      error: error.message
    });
  }
});

module.exports = router;

/**
 * GET /api/moderation/flags/user
 * Get user's submitted flags
 */
router.get('/flags/user', async (req, res) => {
  try {
    const userAddress = req.user?.address || req.walletAddress;
    const { status, limit, skip } = req.query;

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'User address required'
      });
    }

    const result = await reportingService.getUserFlags(userAddress, {
      status,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user flags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/flags/:flagId
 * Get flag details
 */
router.get('/flags/:flagId', async (req, res) => {
  try {
    const { flagId } = req.params;

    const result = await reportingService.getFlagDetails(flagId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching flag:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/content/:contentId/flags
 * Get all flags for a content
 */
router.get('/content/:contentId/flags', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { limit, skip } = req.query;

    const result = await reportingService.getContentFlags(parseInt(contentId), {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching content flags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', verifyModerator, async (req, res) => {
  try {
    const stats = await moderationService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/audit/logs
 * Get audit logs (admin only)
 */
router.get('/audit/logs', verifyAdmin, async (req, res) => {
  try {
    const { action, limit, skip } = req.query;
    const result = await auditLogService.search(action || '*', {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/audit/stats
 * Get audit statistics (admin only)
 */
router.get('/audit/stats', verifyAdmin, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const stats = await auditLogService.getSystemStats({
      timeRange: parseInt(timeRange) || 30
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
