/**
 * Moderation Service
 * Core service for managing moderation queue and workflow
 */

const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');
const Content = require('../models/Content');
const { v4: uuidv4 } = require('uuid');

class ModerationService {
  /**
   * Get next queue ID
   */
  async getNextQueueId() {
    try {
      const lastQueue = await ModerationQueue.findOne()
        .sort({ queueId: -1 })
        .lean();
      return (lastQueue?.queueId || 0) + 1;
    } catch (error) {
      console.error('Error getting next queue ID:', error);
      throw error;
    }
  }

  /**
   * Create moderation queue entry from content flag
   */
  async createQueueEntry(contentId, flags, options = {}) {
    try {
      const content = await Content.findOne({ contentId });
      if (!content) {
        throw new Error(`Content ${contentId} not found`);
      }

      // Check if queue entry already exists
      let existingQueue = await ModerationQueue.findOne({ contentId, status: { $ne: 'resolved' } });
      if (existingQueue) {
        // Merge flags into existing queue
        return this.mergeFlags(existingQueue._id, flags);
      }

      // Calculate severity based on flag reasons
      const severity = this.calculateSeverity(flags);
      const priority = this.calculatePriority(severity, flags.length);

      const queueId = await this.getNextQueueId();
      const queue = new ModerationQueue({
        queueId,
        contentId,
        contentTitle: content.title,
        creator: content.creator,
        contentType: content.contentType,
        status: 'pending',
        severity,
        priority,
        flagCount: flags.length,
        firstFlaggedAt: new Date(),
        lastFlaggedAt: new Date(),
        tags: this.extractTags(flags),
        flags: flags.map(f => ({
          flagId: f._id,
          flaggedBy: f.flaggedBy,
          reason: f.reason,
          details: f.description,
          flaggedAt: f.createdAt
        })),
        contentSnapshot: {
          title: content.title,
          description: content.description,
          url: content.url,
          price: content.price,
          isRemoved: content.isRemoved,
          removedAt: content.removedAt,
          removalReason: content.removalReason
        },
        ...options
      });

      await queue.save();

      // Log the creation
      await this.createAuditLog({
        actor: 'system',
        action: 'queue-created',
        queueId: queue.queueId,
        contentId,
        actionDetails: {
          newStatus: 'pending',
          newSeverity: severity,
          newPriority: priority
        },
        affectedEntities: {
          flagIds: flags.map(f => f._id)
        }
      });

      return queue;
    } catch (error) {
      console.error('Error creating moderation queue entry:', error);
      throw error;
    }
  }

  /**
   * Merge multiple flags into existing queue entry
   */
  async mergeFlags(queueId, newFlags) {
    try {
      const queue = await ModerationQueue.findById(queueId);
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      // Add new flags
      const mergedFlags = [
        ...queue.flags,
        ...newFlags.map(f => ({
          flagId: f._id,
          flaggedBy: f.flaggedBy,
          reason: f.reason,
          details: f.description,
          flaggedAt: f.createdAt
        }))
      ];

      queue.flagCount = mergedFlags.length;
      queue.lastFlaggedAt = new Date();
      queue.flags = mergedFlags;

      // Recalculate severity and priority
      const reasons = mergedFlags.map(f => f.reason);
      queue.severity = this.calculateSeverity({ reasons });
      queue.priority = this.calculatePriority(queue.severity, mergedFlags.length);
      queue.tags = this.extractTags(newFlags);

      // Add to review history
      queue.reviewHistory.push({
        action: 'received-additional-flags',
        notes: `${newFlags.length} additional flags merged`,
        timestamp: new Date()
      });

      await queue.save();

      // Log the merge
      await this.createAuditLog({
        actor: 'system',
        action: 'flags-merged',
        queueId: queue.queueId,
        contentId: queue.contentId,
        actionDetails: {
          flagsMergedCount: newFlags.length
        },
        affectedEntities: {
          flagIds: newFlags.map(f => f._id)
        }
      });

      return queue;
    } catch (error) {
      console.error('Error merging flags:', error);
      throw error;
    }
  }

  /**
   * Get moderation queue with filters
   */
  async getQueue(filters = {}) {
    try {
      const {
        status = 'pending',
        severity,
        assignedModerator,
        contentType,
        limit = 50,
        skip = 0,
        sort = '-priority -createdAt'
      } = filters;

      let query = {};

      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      if (severity) {
        query.severity = Array.isArray(severity) ? { $in: severity } : severity;
      }

      if (assignedModerator) {
        query.assignedModerator = assignedModerator.toLowerCase();
      }

      if (contentType) {
        query.contentType = contentType;
      }

      const queue = await ModerationQueue.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationQueue.countDocuments(query);

      return {
        queue,
        total,
        limit,
        skip,
        hasMore: skip + queue.length < total
      };
    } catch (error) {
      console.error('Error fetching queue:', error);
      throw error;
    }
  }

  /**
   * Assign queue entry to moderator
   */
  async assignToModerator(queueId, moderatorAddress, notes = '') {
    try {
      const queue = await ModerationQueue.findOne({ queueId });
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      const previousAssignee = queue.assignedModerator;
      queue.assignedModerator = moderatorAddress.toLowerCase();
      queue.assignedAt = new Date();
      queue.status = 'under-review';

      queue.reviewHistory.push({
        reviewerAddress: moderatorAddress.toLowerCase(),
        action: 'assigned',
        notes: notes || 'Content assigned for review',
        timestamp: new Date(),
        changes: {
          previousAssignee,
          newAssignee: queue.assignedModerator
        }
      });

      await queue.save();

      // Log the assignment
      await this.createAuditLog({
        actor: 'system',
        action: 'queue-assigned',
        queueId,
        contentId: queue.contentId,
        actionDetails: {
          previousAssignee,
          newAssignee: moderatorAddress.toLowerCase()
        }
      });

      return queue;
    } catch (error) {
      console.error('Error assigning queue entry:', error);
      throw error;
    }
  }

  /**
   * Start review of content
   */
  async startReview(queueId, moderatorAddress, notes = '') {
    try {
      const queue = await ModerationQueue.findOne({ queueId });
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      queue.reviewStartedAt = new Date();
      queue.status = 'under-review';
      queue.assignedModerator = moderatorAddress.toLowerCase();

      queue.reviewHistory.push({
        reviewerAddress: moderatorAddress.toLowerCase(),
        action: 'reviewed',
        notes: notes || 'Review started',
        timestamp: new Date()
      });

      await queue.save();

      // Log the review start
      await this.createAuditLog({
        actor: 'moderator',
        actorAddress: moderatorAddress.toLowerCase(),
        action: 'review-started',
        queueId,
        contentId: queue.contentId,
        notes
      });

      return queue;
    } catch (error) {
      console.error('Error starting review:', error);
      throw error;
    }
  }

  /**
   * Approve content (resolve flags)
   */
  async approveContent(queueId, moderatorAddress, notes = '') {
    try {
      const queue = await ModerationQueue.findOne({ queueId });
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      queue.status = 'approved';
      queue.decision = 'approved';
      queue.decisionReason = notes || 'Content approved after review';
      queue.reviewCompletedAt = new Date();
      queue.assignedModerator = moderatorAddress.toLowerCase();

      queue.reviewHistory.push({
        reviewerAddress: moderatorAddress.toLowerCase(),
        action: 'approved',
        notes: notes || 'Content approved',
        timestamp: new Date(),
        changes: { decision: 'approved' }
      });

      await queue.save();

      // Log the approval
      await this.createAuditLog({
        actor: 'moderator',
        actorAddress: moderatorAddress.toLowerCase(),
        action: 'content-approved',
        queueId,
        contentId: queue.contentId,
        actionDetails: {
          newStatus: 'approved',
          decision: 'approved'
        },
        notes
      });

      return queue;
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  /**
   * Reject content (mark for removal)
   */
  async rejectContent(queueId, moderatorAddress, removalReason, decisionNotes = '') {
    try {
      const queue = await ModerationQueue.findOne({ queueId });
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      // Update content
      const content = await Content.findOne({ contentId: queue.contentId });
      if (content) {
        content.isRemoved = true;
        content.removedAt = new Date();
        content.removalReason = removalReason;
        await content.save();
      }

      queue.status = 'removed';
      queue.decision = 'removed';
      queue.removalReason = removalReason;
      queue.decisionReason = decisionNotes || 'Content removed per violation';
      queue.decisionNotes = decisionNotes;
      queue.reviewCompletedAt = new Date();
      queue.assignedModerator = moderatorAddress.toLowerCase();
      queue.appealDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      queue.reviewHistory.push({
        reviewerAddress: moderatorAddress.toLowerCase(),
        action: 'removed',
        notes: decisionNotes || 'Content removed',
        timestamp: new Date(),
        changes: {
          decision: 'removed',
          removalReason
        }
      });

      await queue.save();

      // Log the rejection
      await this.createAuditLog({
        actor: 'moderator',
        actorAddress: moderatorAddress.toLowerCase(),
        action: 'content-removed',
        queueId,
        contentId: queue.contentId,
        actionDetails: {
          newStatus: 'removed',
          decision: 'removed',
          removalReason
        },
        notes: decisionNotes
      });

      return queue;
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  }

  /**
   * File appeal against removal
   */
  async fileAppeal(queueId, creatorAddress, appealNotes) {
    try {
      const queue = await ModerationQueue.findOne({ queueId });
      if (!queue) {
        throw new Error('Queue entry not found');
      }

      if (queue.status !== 'removed') {
        throw new Error('Appeals can only be filed for removed content');
      }

      if (new Date() > queue.appealDeadline) {
        throw new Error('Appeal deadline has passed');
      }

      queue.status = 'appealed';
      queue.appealCount++;
      queue.lastAppealAt = new Date();

      queue.reviewHistory.push({
        reviewerAddress: creatorAddress.toLowerCase(),
        action: 'appeal-filed',
        notes: appealNotes,
        timestamp: new Date()
      });

      await queue.save();

      // Update content to mark as appealed
      const content = await Content.findOne({ contentId: queue.contentId });
      if (content) {
        content.isRemoved = false;
        content.removalReason = 'pending-appeal';
        await content.save();
      }

      // Log the appeal
      await this.createAuditLog({
        actor: 'creator',
        actorAddress: creatorAddress.toLowerCase(),
        action: 'appeal-filed',
        queueId,
        contentId: queue.contentId,
        notes: appealNotes
      });

      return queue;
    } catch (error) {
      console.error('Error filing appeal:', error);
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(logData) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        ...logData
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw - audit logs shouldn't block operations
    }
  }

  /**
   * Calculate severity based on flag reasons
   */
  calculateSeverity(flags) {
    const criticalReasons = ['illegal-content', 'adult-content', 'violence'];
    const highReasons = ['hate-speech', 'harassment', 'copyright-violation'];

    const reasons = flags.reasons || (Array.isArray(flags) ? flags.map(f => f.reason) : []);

    if (reasons.some(r => criticalReasons.includes(r))) {
      return 'critical';
    }
    if (reasons.some(r => highReasons.includes(r))) {
      return 'high';
    }
    if (reasons.length >= 3) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate priority based on severity and flag count
   */
  calculatePriority(severity, flagCount) {
    const severityMap = { critical: 5, high: 4, medium: 3, low: 2 };
    let basePriority = severityMap[severity] || 2;

    // Increase priority if multiple flags
    if (flagCount >= 5) {
      basePriority = Math.min(5, basePriority + 1);
    }

    return basePriority;
  }

  /**
   * Extract tags from flags
   */
  extractTags(flags) {
    const tags = new Set();

    flags.forEach(flag => {
      tags.add(flag.reason);
      if (flag.flagType) {
        tags.add(flag.flagType);
      }
    });

    return Array.from(tags);
  }

  /**
   * Perform automatic content filtering and flagging
   */
  async autoFilterContent(content) {
    try {
      const keywordFilterService = require('./keywordFilterService');

      // Analyze content using keyword filter
      const analysis = keywordFilterService.analyzeContent(content);
      const assessment = keywordFilterService.getRiskAssessment(analysis);

      const result = {
        analysis,
        assessment,
        flagged: assessment.recommendation === 'auto-flag',
        shouldReview: ['auto-flag', 'flag-for-review'].includes(assessment.recommendation)
      };

      // If content should be flagged, create a flag
      if (result.shouldReview) {
        // Determine the reason from detected findings
        let primaryReason = 'other';
        let severity = 'medium';

        if (analysis.detected.length > 0) {
          const primaryDetection = analysis.detected[0];
          primaryReason = primaryDetection.reason;
          severity = primaryDetection.severity;
        }

        const flagData = {
          flagId: `auto-${uuidv4()}`,
          contentId: content.contentId || content._id,
          flaggedBy: 'system',
          flagType: 'automated-detection',
          reason: primaryReason,
          description: `Auto-flagged content: ${assessment.reasons.join('; ')}`,
          evidence: {
            keywords: analysis.detected.map(d => ({ category: d.category, matches: d.count })),
            riskLevel: assessment.risk_level,
            confidence: assessment.confidence
          },
          severity: severity,
          status: 'received',
          reportMetadata: {
            detectedAt: new Date(),
            riskAssessment: assessment,
            analysisData: analysis
          }
        };

        result.flag = flagData;
      }

      return result;
    } catch (error) {
      console.error('Error in auto-filter content:', error);
      throw error;
    }
  }

  /**
   * Process auto-flagged content and create queue entry
   */
  async processAutoFlaggedContent(content, autoFilterResult) {
    try {
      if (!autoFilterResult.flag) {
        return { queued: false, reason: 'No flag generated' };
      }

      // Create ModerationFlag record
      const flag = new ModerationFlag(autoFilterResult.flag);
      await flag.save();

      // Create or merge into queue
      let queue = await ModerationQueue.findOne({
        contentId: content.contentId || content._id,
        status: { $ne: 'resolved' }
      });

      if (queue) {
        // Merge into existing queue
        queue = await this.mergeFlags(queue._id, [flag]);
      } else {
        // Create new queue entry
        queue = await this.createQueueEntry(
          content.contentId || content._id,
          [flag],
          {
            autoFlaggedAt: new Date(),
            autoFlagReason: autoFilterResult.assessment.reasons.join('; ')
          }
        );
      }

      return {
        queued: true,
        queueId: queue.queueId,
        flagId: flag._id,
        severity: queue.severity,
        priority: queue.priority
      };
    } catch (error) {
      console.error('Error processing auto-flagged content:', error);
      throw error;
    }
  }

  /**
   * Check if content should be auto-flagged on upload
   */
  async validateContentOnUpload(content) {
    try {
      const autoFilterResult = await this.autoFilterContent(content);

      if (autoFilterResult.shouldReview) {
        const queueResult = await this.processAutoFlaggedContent(content, autoFilterResult);
        return {
          valid: true,
          autoFlagged: true,
          flagReason: autoFilterResult.assessment.reasons.join('; '),
          queueId: queueResult.queueId,
          recommendation: autoFilterResult.assessment.recommendation
        };
      }

      return {
        valid: true,
        autoFlagged: false,
        flagReason: null
      };
    } catch (error) {
      console.error('Error validating content on upload:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get moderation stats
   */
  async getStats() {
    try {
      const stats = {
        byStatus: {},
        bySeverity: {},
        byContentType: {},
        averageReviewTime: 0,
        totalFlags: 0,
        removalRate: 0
      };

      // Count by status
      const statusGroups = await ModerationQueue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      statusGroups.forEach(group => {
        stats.byStatus[group._id] = group.count;
      });

      // Count by severity
      const severityGroups = await ModerationQueue.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]);

      severityGroups.forEach(group => {
        stats.bySeverity[group._id] = group.count;
      });

      // Count by content type
      const typeGroups = await ModerationQueue.aggregate([
        {
          $group: {
            _id: '$contentType',
            count: { $sum: 1 }
          }
        }
      ]);

      typeGroups.forEach(group => {
        stats.byContentType[group._id] = group.count;
      });

      // Average review time
      const reviewedItems = await ModerationQueue.find({
        reviewCompletedAt: { $exists: true, $ne: null }
      }).select('reviewStartedAt reviewCompletedAt');

      if (reviewedItems.length > 0) {
        const totalTime = reviewedItems.reduce((sum, item) => {
          return sum + (item.reviewCompletedAt - item.reviewStartedAt);
        }, 0);
        stats.averageReviewTime = Math.round(totalTime / reviewedItems.length / 3600000); // hours
      }

      // Removal rate
      const total = await ModerationQueue.countDocuments();
      const removed = await ModerationQueue.countDocuments({ status: 'removed' });
      stats.removalRate = total > 0 ? (removed / total * 100).toFixed(2) : 0;
      stats.totalFlags = await ModerationFlag.countDocuments();

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new ModerationService();
