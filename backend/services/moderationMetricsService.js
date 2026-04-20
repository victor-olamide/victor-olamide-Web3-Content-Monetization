/**
 * Moderation Metrics Service
 * Collects and calculates metrics for moderation performance and health
 */

const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');

class ModerationMetricsService {
  /**
   * Get moderation queue health metrics
   */
  async getQueueHealth() {
    try {
      const total = await ModerationQueue.countDocuments({});
      const pending = await ModerationQueue.countDocuments({ status: 'pending' });
      const underReview = await ModerationQueue.countDocuments({ status: 'under-review' });
      const resolved = await ModerationQueue.countDocuments({
        status: { $in: ['approved', 'removed'] }
      });

      const avgReviewTime = await this.calculateAverageReviewTime();

      return {
        total,
        pending,
        underReview,
        resolved,
        pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(2) : 0,
        resolvedPercentage: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0,
        underReviewPercentage: total > 0 ? ((underReview / total) * 100).toFixed(2) : 0,
        averageReviewTimeHours: avgReviewTime,
        health: this.calculateQueueHealth({ pending, total, avgReviewTime })
      };
    } catch (error) {
      console.error('Error calculating queue health:', error);
      throw error;
    }
  }

  /**
   * Calculate average review time
   */
  async calculateAverageReviewTime() {
    try {
      const results = await ModerationQueue.aggregate([
        {
          $match: {
            reviewStartedAt: { $exists: true, $ne: null },
            reviewCompletedAt: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            reviewTimeDiff: {
              $subtract: ['$reviewCompletedAt', '$reviewStartedAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            averageTime: { $avg: '$reviewTimeDiff' }
          }
        }
      ]);

      if (results.length === 0) return null;

      // Convert milliseconds to hours
      const avgMs = results[0].averageTime;
      return (avgMs / (1000 * 60 * 60)).toFixed(2);
    } catch (error) {
      console.error('Error calculating average review time:', error);
      return null;
    }
  }

  /**
   * Calculate queue health score
   */
  calculateQueueHealth({ pending, total, avgReviewTime }) {
    let healthScore = 100;

    // Reduce score based on pending items
    const pendingPercentage = (pending / total) * 100;
    if (pendingPercentage > 50) healthScore -= 40;
    else if (pendingPercentage > 30) healthScore -= 20;
    else if (pendingPercentage > 10) healthScore -= 10;

    // Reduce score based on review time
    if (avgReviewTime) {
      if (avgReviewTime > 72) healthScore -= 20; // More than 3 days
      else if (avgReviewTime > 48) healthScore -= 10; // More than 2 days
    }

    // Classify health
    if (healthScore >= 80) return 'excellent';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Get flagging patterns and trends
   */
  async getFlaggingPatterns(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get flags by reason
      const flagsByReason = await ModerationFlag.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Get flags by severity
      const flagsBySeverity = await ModerationFlag.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Get flags by content type
      const flagsByContentType = await ModerationQueue.aggregate([
        { $match: { firstFlaggedAt: { $gte: startDate } } },
        { $group: { _id: '$contentType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        period: `Last ${days} days`,
        startDate,
        flagsByReason,
        flagsBySeverity,
        flagsByContentType
      };
    } catch (error) {
      console.error('Error getting flagging patterns:', error);
      throw error;
    }
  }

  /**
   * Get moderator performance metrics
   */
  async getModeratorPerformance() {
    try {
      const moderators = await ModerationQueue.aggregate([
        {
          $match: {
            assignedModerator: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$assignedModerator',
            itemsReviewed: { $sum: 1 },
            itemsApproved: {
              $sum: { $cond: [{ $eq: ['$decision', 'approved'] }, 1, 0] }
            },
            itemsRemoved: {
              $sum: { $cond: [{ $eq: ['$decision', 'removed'] }, 1, 0] }
            }
          }
        },
        { $sort: { itemsReviewed: -1 } }
      ]);

      // Calculate approval and removal rates
      const results = moderators.map(mod => {
        const approvalRate = mod.itemsReviewed > 0 
          ? ((mod.itemsApproved / mod.itemsReviewed) * 100).toFixed(2) 
          : 0;
        const removalRate = mod.itemsReviewed > 0 
          ? ((mod.itemsRemoved / mod.itemsReviewed) * 100).toFixed(2) 
          : 0;

        return {
          moderatorId: mod._id,
          itemsReviewed: mod.itemsReviewed,
          itemsApproved: mod.itemsApproved,
          itemsRemoved: mod.itemsRemoved,
          approvalRate: parseFloat(approvalRate),
          removalRate: parseFloat(removalRate)
        };
      });

      return results;
    } catch (error) {
      console.error('Error getting moderator performance:', error);
      throw error;
    }
  }

  /**
   * Get determination statistics
   */
  async getDeterminationStats() {
    try {
      const stats = await ModerationQueue.aggregate([
        {
          $group: {
            _id: '$decision',
            count: { $sum: 1 }
          }
        }
      ]);

      const total = stats.reduce((sum, s) => sum + s.count, 0);

      const result = {};
      for (const stat of stats) {
        result[stat._id] = {
          count: stat.count,
          percentage: total > 0 ? ((stat.count / total) * 100).toFixed(2) : 0
        };
      }

      return {
        total,
        determinations: result
      };
    } catch (error) {
      console.error('Error getting determination stats:', error);
      throw error;
    }
  }

  /**
   * Get appeal statistics
   */
  async getAppealStats() {
    try {
      const totalAppeals = await ModerationQueue.aggregate([
        {
          $match: { status: 'appealed' }
        },
        {
          $group: {
            _id: null,
            totalAppeals: { $sum: 1 },
            avgAppealCount: { $avg: '$appealCount' }
          }
        }
      ]);

      return {
        totalAppeals: totalAppeals[0]?.totalAppeals || 0,
        averageAppealPerContent: totalAppeals[0]?.avgAppealCount?.toFixed(2) || 0
      };
    } catch (error) {
      console.error('Error getting appeal stats:', error);
      throw error;
    }
  }

  /**
   * Get system-wide moderation KPIs
   */
  async getKPIs() {
    try {
      const queueHealth = await this.getQueueHealth();
      const determinations = await this.getDeterminationStats();
      const appeals = await this.getAppealStats();

      // Calculate flags per item
      const totalFlags = await ModerationFlag.countDocuments({});
      const totalQueued = await ModerationQueue.countDocuments({});
      const flagsPerItem = totalQueued > 0 ? (totalFlags / totalQueued).toFixed(2) : 0;

      return {
        queueHealth: queueHealth.health,
        totalQueueItems: queueHealth.total,
        pendingItems: queueHealth.pending,
        averageReviewHours: queueHealth.averageReviewTimeHours,
        removalRate: determinations.determinations.removed?.percentage || 0,
        approvalRate: determinations.determinations.approved?.percentage || 0,
        flagsPerItem,
        totalAppeals: appeals.totalAppeals,
        appealRate: totalQueued > 0 ? ((appeals.totalAppeals / totalQueued) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      throw error;
    }
  }
}

module.exports = new ModerationMetricsService();
