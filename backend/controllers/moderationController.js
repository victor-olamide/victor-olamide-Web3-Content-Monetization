/**
 * Moderation Controller
 * Handles API endpoints for content moderation system
 */

const moderationService = require('../services/moderationService');
const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Submit content flag/report
 */
const submitContentFlag = async (req, res) => {
  try {
    const { contentId, reason, description, evidence } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Validate input
    if (!contentId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'contentId and reason are required'
      });
    }

    const validReasons = [
      'copyright-violation',
      'adult-content',
      'hate-speech',
      'violence',
      'misinformation',
      'spam',
      'harassment',
      'illegal-content',
      'low-quality',
      'misleading-title',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reason provided',
        validReasons
      });
    }

    // Create flag
    const flag = new ModerationFlag({
      flagId: `flag-${Date.now()}-${userId}`,
      contentId,
      flaggedBy: userId,
      flagType: 'user-report',
      reason,
      description,
      evidence,
      severity: moderationService.calculateSeverity({ reasons: [reason] }),
      status: 'received',
      reportMetadata: {
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      }
    });

    await flag.save();

    // Check if queue entry exists, if not create it
    let queue = await ModerationQueue.findOne({
      contentId,
      status: { $ne: 'resolved' }
    });

    if (!queue) {
      queue = await moderationService.createQueueEntry(contentId, [flag]);
    } else {
      queue = await moderationService.mergeFlags(queue._id, [flag]);
    }

    // Log the action
    await AdminAuditLog.logAction(
      userId,
      userEmail,
      'CREATE',
      'MODERATION_FLAG',
      contentId.toString(),
      { reason, description },
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      message: 'Content flagged successfully',
      data: {
        flagId: flag.flagId,
        queueId: queue.queueId,
        status: queue.status,
        severity: queue.severity,
        priority: queue.priority
      }
    });
  } catch (error) {
    console.error('Error submitting content flag:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting content flag',
      error: error.message
    });
  }
};

/**
 * Get moderation queue for admins
 */
const getModerationQueue = async (req, res) => {
  try {
    const {
      status = 'pending',
      severity,
      assignedModerator,
      contentType,
      search,
      limit = 50,
      page = 1,
      sortBy = '-priority'
    } = req.query;

    const skip = (page - 1) * limit;

    const result = await moderationService.getQueue({
      status,
      severity,
      assignedModerator,
      contentType,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort: sortBy
    });

    // Log access
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'MODERATION_QUEUE',
      'queue-view',
      { filters: { status, severity, assignedModerator, contentType }, page, limit },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result,
      pagination: {
        total: result.total,
        limit: parseInt(limit),
        page: parseInt(page),
        pages: Math.ceil(result.total / limit),
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation queue',
      error: error.message
    });
  }
};

/**
 * Get specific queue entry details
 */
const getQueueEntry = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue = await ModerationQueue.findOne({ queueId: parseInt(queueId) });
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    // Get all flags for this content
    const flags = await ModerationFlag.find({ contentId: queue.contentId });

    res.json({
      success: true,
      data: {
        queue,
        flags,
        totalFlags: flags.length
      }
    });
  } catch (error) {
    console.error('Error fetching queue entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue entry',
      error: error.message
    });
  }
};

/**
 * Assign queue entry to moderator
 */
const assignQueueEntry = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { targetModerator = null, notes } = req.body;
    const moderatorId = targetModerator || req.user.id;

    const queue = await ModerationQueue.findOne({ queueId: parseInt(queueId) });
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const result = await moderationService.assignToModerator(
      parseInt(queueId),
      moderatorId,
      notes
    );

    // Log the action
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'UPDATE',
      'MODERATION_QUEUE',
      queueId,
      { assignedTo: moderatorId, notes },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Queue entry assigned successfully',
      data: result
    });
  } catch (error) {
    console.error('Error assigning queue entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning queue entry',
      error: error.message
    });
  }
};

/**
 * Approve content in moderation queue
 */
const approveQueueEntry = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { notes } = req.body;
    const moderatorId = req.user.id;

    const queue = await ModerationQueue.findOne({ queueId: parseInt(queueId) });
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const result = await moderationService.approveContent(
      parseInt(queueId),
      moderatorId,
      notes
    );

    // Log the action
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'UPDATE',
      'MODERATION_QUEUE',
      queueId,
      { action: 'approved', notes },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Content approved',
      data: result
    });
  } catch (error) {
    console.error('Error approving queue entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving queue entry',
      error: error.message
    });
  }
};

/**
 * Reject/remove content from moderation queue
 */
const rejectQueueEntry = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { removalReason, notes } = req.body;
    const moderatorId = req.user.id;

    if (!removalReason) {
      return res.status(400).json({
        success: false,
        message: 'removalReason is required'
      });
    }

    const validReasons = [
      'copyright-violation',
      'adult-content',
      'hate-speech',
      'violence',
      'misinformation',
      'spam',
      'harassment',
      'illegal-content',
      'other'
    ];

    if (!validReasons.includes(removalReason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid removal reason',
        validReasons
      });
    }

    const queue = await ModerationQueue.findOne({ queueId: parseInt(queueId) });
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const result = await moderationService.rejectContent(
      parseInt(queueId),
      moderatorId,
      removalReason,
      notes
    );

    // Log the action
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'UPDATE',
      'MODERATION_QUEUE',
      queueId,
      { action: 'rejected', removalReason, notes },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Content removed',
      data: result
    });
  } catch (error) {
    console.error('Error rejecting queue entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting queue entry',
      error: error.message
    });
  }
};

/**
 * Get moderation statistics
 */
const getModerationStats = async (req, res) => {
  try {
    const stats = await moderationService.getStats();

    // Add additional metrics
    const totalQueued = await ModerationQueue.countDocuments({});
    const pendingCount = await ModerationQueue.countDocuments({ status: 'pending' });
    const underReviewCount = await ModerationQueue.countDocuments({ status: 'under-review' });
    const resolvedCount = await ModerationQueue.countDocuments({
      status: { $in: ['approved', 'removed'] }
    });

    const totalFlags = await ModerationFlag.countDocuments({});

    res.json({
      success: true,
      data: {
        ...stats,
        queueMetrics: {
          total: totalQueued,
          pending: pendingCount,
          underReview: underReviewCount,
          resolved: resolvedCount,
          pendingPercentage: totalQueued > 0 ? ((pendingCount / totalQueued) * 100).toFixed(2) : 0,
          resolvedPercentage: totalQueued > 0 ? ((resolvedCount / totalQueued) * 100).toFixed(2) : 0
        },
        flagMetrics: {
          totalFlags,
          averageFlagsPerContent: totalQueued > 0 ? (totalFlags / totalQueued).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation statistics',
      error: error.message
    });
  }
};

module.exports = {
  submitContentFlag,
  getModerationQueue,
  getQueueEntry,
  assignQueueEntry,
  approveQueueEntry,
  rejectQueueEntry,
  getModerationStats
};
