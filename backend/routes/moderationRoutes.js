/**
 * Moderation Routes
 * API endpoints for content moderation system
 */

const express = require('express');
const router = express.Router();
const moderationService = require('../services/moderationService');
const reportingService = require('../services/reportingService');
const auditLogService = require('../services/auditLogService');
const {
  verifyModerator,
  verifyAdmin,
  verifyQueueAccess,
  verifyContentCreator
} = require('../middleware/moderationAuth');
const {
  validateFlagSubmission,
  validateModerationDecision,
  validateAppealSubmission,
  validateQueueFilters
} = require('../middleware/contentFlagValidation');

/**
 * POST /api/moderation/flag
 * Submit a flag/report for content
 */
router.post('/flag', validateFlagSubmission, async (req, res) => {
  try {
    const { contentId, reason, description, evidence, userContact } = req.body;
    const userAddress = req.user?.address || req.walletAddress;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await reportingService.submitFlag(contentId, {
      flaggedBy: userAddress,
      reason,
      description,
      evidence,
      userContact,
      ipAddress,
      userAgent
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        flagId: result.flag.flagId,
        queueId: result.queue.queueId,
        status: result.queue.status,
        severity: result.queue.severity
      }
    });
  } catch (error) {
    console.error('Error submitting flag:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/queue
 * Get moderation queue (requires moderator auth)
 */
router.get('/queue', verifyModerator, validateQueueFilters, async (req, res) => {
  try {
    const { status = 'pending', severity, limit, skip, contentType, sort } = req.query;

    const result = await moderationService.getQueue({
      status,
      severity,
      contentType,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      sort: sort || '-priority -createdAt'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/moderation/queue/:queueId
 * Get specific queue entry details
 */
router.get('/queue/:queueId', verifyModerator, verifyQueueAccess, async (req, res) => {
  try {
    const queue = req.queue;

    // Get related flags
    const flags = await reportingService.getContentFlags(queue.contentId);

    // Get audit trail
    const auditTrail = await auditLogService.getAuditTrail(queue.contentId, queue.queueId);

    res.json({
      success: true,
      data: {
        queue,
        flags,
        auditTrail
      }
    });
  } catch (error) {
    console.error('Error fetching queue entry:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/queue/:queueId/assign
 * Assign queue entry to moderator
 */
router.post('/queue/:queueId/assign', verifyModerator, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { targetModerator = null, notes } = req.body;
    const moderatorAddress = targetModerator || req.moderator.address;

    const result = await moderationService.assignToModerator(
      parseInt(queueId),
      moderatorAddress,
      notes
    );

    res.json({
      success: true,
      message: 'Queue entry assigned successfully',
      data: result
    });
  } catch (error) {
    console.error('Error assigning queue entry:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/queue/:queueId/review/start
 * Start reviewing a queue entry
 */
router.post('/queue/:queueId/review/start', verifyModerator, verifyQueueAccess, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { notes } = req.body;
    const moderatorAddress = req.moderator.address;

    const result = await moderationService.startReview(
      parseInt(queueId),
      moderatorAddress,
      notes
    );

    res.json({
      success: true,
      message: 'Review started',
      data: result
    });
  } catch (error) {
    console.error('Error starting review:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/queue/:queueId/review/approve
 * Approve content (resolve flags)
 */
router.post('/queue/:queueId/review/approve', verifyModerator, verifyQueueAccess, validateModerationDecision, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { decisionNotes } = req.body;
    const moderatorAddress = req.moderator.address;

    const result = await moderationService.approveContent(
      parseInt(queueId),
      moderatorAddress,
      decisionNotes
    );

    res.json({
      success: true,
      message: 'Content approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/queue/:queueId/review/reject
 * Reject content (mark for removal)
 */
router.post('/queue/:queueId/review/reject', verifyModerator, verifyQueueAccess, validateModerationDecision, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { removalReason, decisionNotes } = req.body;
    const moderatorAddress = req.moderator.address;

    if (!removalReason) {
      return res.status(400).json({
        success: false,
        error: 'Removal reason is required'
      });
    }

    const result = await moderationService.rejectContent(
      parseInt(queueId),
      moderatorAddress,
      removalReason,
      decisionNotes
    );

    res.json({
      success: true,
      message: 'Content rejected and marked for removal',
      data: result
    });
  } catch (error) {
    console.error('Error rejecting content:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/moderation/appeal/:contentId
 * File appeal against content removal
 */
router.post('/appeal/:contentId', verifyContentCreator, validateAppealSubmission, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { appealNotes } = req.body;
    const creatorAddress = req.user?.address || req.walletAddress;

    // Find the queue entry for this content
    const ModerationQueue = require('../models/ModerationQueue');
    const queue = await ModerationQueue.findOne({
      contentId: parseInt(contentId),
      status: 'removed'
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No removal record found for this content or content not removed'
      });
    }

    const result = await moderationService.fileAppeal(
      queue.queueId,
      creatorAddress,
      appealNotes
    );

    res.json({
      success: true,
      message: 'Appeal filed successfully. Review team will assess within 7 days.',
      data: {
        queueId: result.queueId,
        status: result.status,
        appealCount: result.appealCount,
        appealDeadline: result.appealDeadline
      }
    });
  } catch (error) {
    console.error('Error filing appeal:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

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
