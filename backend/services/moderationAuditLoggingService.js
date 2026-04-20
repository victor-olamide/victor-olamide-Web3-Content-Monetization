/**
 * Moderation Audit Logging Service
 * Comprehensive logging for all moderation actions and decisions
 */

const ModerationAuditLog = require('../models/ModerationAuditLog');
const { v4: uuidv4 } = require('uuid');

class ModerationAuditLoggingService {
  /**
   * Log flag submission
   */
  async logFlagSubmission(flagData, submission) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: 'flag-submitted',
        actor: submission.flaggedBy || 'unknown',
        actorType: submission.flagType === 'automated-detection' ? 'system' : 'user',
        targetContentId: flagData.contentId,
        targetQueueId: submission.queueId,
        actionDetails: {
          flagId: flagData.flagId,
          reason: flagData.reason,
          flagType: submission.flagType || 'user-report',
          severity: flagData.severity
        },
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging flag submission:', error);
      // Don't throw - audit logging shouldn't block operations
    }
  }

  /**
   * Log queue assignment
   */
  async logQueueAssignment(queueId, assignedTo, previousAssignee, notes) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: 'queue-assigned',
        actor: 'system',
        actorType: 'system',
        targetQueueId: queueId,
        actionDetails: {
          assignedTo,
          previousAssignee: previousAssignee || 'unassigned',
          notes
        },
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging queue assignment:', error);
    }
  }

  /**
   * Log review action
   */
  async logReviewAction(queueId, moderatorId, action, details) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: `review-${action}`,
        actor: moderatorId,
        actorType: 'moderator',
        targetQueueId: queueId,
        actionDetails: details,
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging review action:', error);
    }
  }

  /**
   * Log content decision (approve/reject)
   */
  async logModerationDecision(queueId, moderatorId, decision, reason, details) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: `decision-${decision}`,
        actor: moderatorId,
        actorType: 'moderator',
        targetQueueId: queueId,
        actionDetails: {
          decision,
          reason,
          details,
          decidedAt: new Date()
        },
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging moderation decision:', error);
    }
  }

  /**
   * Log appeal filing
   */
  async logAppealFiling(queueId, creatorId, appealNotes) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: 'appeal-filed',
        actor: creatorId,
        actorType: 'creator',
        targetQueueId: queueId,
        actionDetails: {
          appealNotes,
          filedAt: new Date()
        },
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging appeal filing:', error);
    }
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(operationType, operationDetails, count) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        action: `bulk-${operationType}`,
        actor: 'system',
        actorType: 'system',
        actionDetails: {
          operationType,
          operationDetails,
          count,
          timestamp: new Date()
        },
        status: 'completed'
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging bulk operation:', error);
    }
  }

  /**
   * Get audit trail for content
   */
  async getAuditTrailForContent(contentId, limit = 100) {
    try {
      const logs = await ModerationAuditLog.find({
        targetContentId: contentId
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return logs;
    } catch (error) {
      console.error('Error fetching audit trail for content:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for queue
   */
  async getAuditTrailForQueue(queueId, limit = 100) {
    try {
      const logs = await ModerationAuditLog.find({
        targetQueueId: queueId
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return logs;
    } catch (error) {
      console.error('Error fetching audit trail for queue:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for moderator
   */
  async getModeratorAuditLogs(moderatorId, limit = 100) {
    try {
      const logs = await ModerationAuditLog.find({
        actor: moderatorId,
        actorType: 'moderator'
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return logs;
    } catch (error) {
      console.error('Error fetching moderator audit logs:', error);
      throw error;
    }
  }

  /**
   * Get moderation activity summary
   */
  async getActivitySummary(dateRange = '7d') {
    try {
      let startDate = new Date();

      switch (dateRange) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      const logs = await ModerationAuditLog.find({
        timestamp: { $gte: startDate }
      }).lean();

      // Aggregate by action
      const actionCounts = {};
      const actorCounts = {};

      for (const log of logs) {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        actorCounts[log.actor] = (actorCounts[log.actor] || 0) + 1;
      }

      return {
        dateRange,
        startDate,
        endDate: new Date(),
        totalActions: logs.length,
        actionBreakdown: actionCounts,
        topModerators: Object.entries(actorCounts)
          .filter(([actor]) => actor !== 'system')
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([actor, count]) => ({ actor, actionCount: count }))
      };
    } catch (error) {
      console.error('Error calculating activity summary:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}) {
    try {
      const query = {};

      if (filters.startDate && filters.endDate) {
        query.timestamp = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.actor) {
        query.actor = filters.actor;
      }

      const logs = await ModerationAuditLog.find(query)
        .sort({ timestamp: -1 })
        .lean();

      return logs;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(daysToKeep = 90) {
    try {
      const archiveDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await ModerationAuditLog.deleteMany({
        timestamp: { $lt: archiveDate }
      });

      console.log(`Archived ${result.deletedCount} audit logs older than ${daysToKeep} days`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error archiving audit logs:', error);
      throw error;
    }
  }
}

module.exports = new ModerationAuditLoggingService();
