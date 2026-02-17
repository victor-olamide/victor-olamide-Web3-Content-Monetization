/**
 * Audit Log Service
 * Manages creation and querying of moderation audit logs
 */

const ModerationAuditLog = require('../models/ModerationAuditLog');
const { v4: uuidv4 } = require('uuid');

class AuditLogService {
  /**
   * Log a moderation action
   */
  async logAction(actionData) {
    try {
      const logId = `audit-${uuidv4()}`;
      const log = new ModerationAuditLog({
        logId,
        timestamp: new Date(),
        ...actionData
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for content
   */
  async getContentLogs(contentId, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sort = '-timestamp'
      } = options;

      const logs = await ModerationAuditLog.find({ contentId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationAuditLog.countDocuments({ contentId });

      return {
        logs,
        total,
        limit,
        skip,
        hasMore: skip + logs.length < total
      };
    } catch (error) {
      console.error('Error fetching content logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for queue entry
   */
  async getQueueLogs(queueId, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sort = '-timestamp'
      } = options;

      const logs = await ModerationAuditLog.find({ queueId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationAuditLog.countDocuments({ queueId });

      return {
        logs,
        total,
        limit,
        skip,
        hasMore: skip + logs.length < total
      };
    } catch (error) {
      console.error('Error fetching queue logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs by moderator
   */
  async getModeratorLogs(moderatorAddress, options = {}) {
    try {
      const {
        action,
        limit = 50,
        skip = 0,
        sort = '-timestamp',
        timeRange = 30 // days
      } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      let query = {
        actorAddress: moderatorAddress.toLowerCase(),
        timestamp: { $gte: startDate }
      };

      if (action) {
        query.action = action;
      }

      const logs = await ModerationAuditLog.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationAuditLog.countDocuments(query);

      // Calculate stats
      const stats = await ModerationAuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        logs,
        stats,
        total,
        limit,
        skip,
        hasMore: skip + logs.length < total
      };
    } catch (error) {
      console.error('Error fetching moderator logs:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for specific action sequence
   */
  async getAuditTrail(contentId, queueId = null) {
    try {
      let query = { contentId };
      if (queueId) {
        query.queueId = queueId;
      }

      const trail = await ModerationAuditLog.find(query)
        .sort('-timestamp')
        .lean();

      // Build timeline
      const timeline = trail.map(log => ({
        timestamp: log.timestamp,
        actor: log.actorAddress || log.actor,
        action: log.action,
        details: log.actionDetails,
        notes: log.notes
      }));

      return {
        contentId,
        queueId,
        actionCount: trail.length,
        timeline,
        firstAction: trail[trail.length - 1]?.timestamp,
        lastAction: trail[0]?.timestamp
      };
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw error;
    }
  }

  /**
   * Get system-wide audit stats
   */
  async getSystemStats(options = {}) {
    try {
      const {
        timeRange = 30 // days
      } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const query = {
        timestamp: { $gte: startDate }
      };

      // Actions by type
      const actionStats = await ModerationAuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Actions by moderator
      const moderatorStats = await ModerationAuditLog.aggregate([
        { $match: query },
        { $match: { actor: 'moderator' } },
        {
          $group: {
            _id: '$actorAddress',
            count: { $sum: 1 },
            actions: { $push: '$action' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Daily trend
      const dailyTrend = await ModerationAuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Success rate
      const total = await ModerationAuditLog.countDocuments(query);
      const successful = await ModerationAuditLog.countDocuments({
        ...query,
        result: 'success'
      });

      return {
        period: `Last ${timeRange} days`,
        actionStats,
        moderatorStats,
        dailyTrend,
        successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
        totalActions: total
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  async search(query, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sort = '-timestamp'
      } = options;

      // Build search query (case-insensitive)
      const searchQuery = {
        $or: [
          { logId: new RegExp(query, 'i') },
          { action: new RegExp(query, 'i') },
          { 'actionDetails.reason': new RegExp(query, 'i') },
          { notes: new RegExp(query, 'i') }
        ]
      };

      const logs = await ModerationAuditLog.find(searchQuery)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationAuditLog.countDocuments(searchQuery);

      return {
        logs,
        total,
        query,
        limit,
        skip,
        hasMore: skip + logs.length < total
      };
    } catch (error) {
      console.error('Error searching audit logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs (for compliance)
   */
  async exportLogs(timeRange = 90) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const logs = await ModerationAuditLog.find({
        timestamp: { $gte: startDate }
      })
        .sort('-timestamp')
        .lean();

      return {
        exportedAt: new Date(),
        timeRange: `Last ${timeRange} days`,
        totalRecords: logs.length,
        data: logs
      };
    } catch (error) {
      console.error('Error exporting logs:', error);
      throw error;
    }
  }
}

module.exports = new AuditLogService();
