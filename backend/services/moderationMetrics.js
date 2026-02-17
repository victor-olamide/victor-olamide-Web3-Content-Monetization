/**
 * Moderation Metrics Service
 * Tracks and reports on moderation system performance
 */

const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');

class ModerationMetricsService {
  /**
   * Get comprehensive moderation metrics
   */
  async getMetrics(options = {}) {
    try {
      const {
        timeRange = 30, // days
        granularity = 'day' // day, week, month
      } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const metrics = {
        period: {
          start: startDate,
          end: new Date(),
          days: timeRange
        },
        queue: await this.getQueueMetrics(startDate),
        flags: await this.getFlagMetrics(startDate),
        reviews: await this.getReviewMetrics(startDate),
        efficiency: await this.getEfficiencyMetrics(startDate),
        moderators: await this.getModeratorMetrics(startDate),
        trend: await this.getTrendMetrics(startDate, granularity)
      };

      return metrics;
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw error;
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(startDate) {
    try {
      const total = await ModerationQueue.countDocuments({
        createdAt: { $gte: startDate }
      });

      const byStatus = await ModerationQueue.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const bySeverity = await ModerationQueue.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]);

      const byContentType = await ModerationQueue.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$contentType',
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate average flags per queue
      const avgFlags = await ModerationQueue.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: null,
            avgFlags: { $avg: '$flagCount' }
          }
        }
      ]);

      return {
        total,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
        byContentType: Object.fromEntries(byContentType.map(s => [s._id, s.count])),
        averageFlags: avgFlags[0]?.avgFlags || 0
      };
    } catch (error) {
      console.error('Error getting queue metrics:', error);
      throw error;
    }
  }

  /**
   * Get flag metrics
   */
  async getFlagMetrics(startDate) {
    try {
      const total = await ModerationFlag.countDocuments({
        createdAt: { $gte: startDate }
      });

      const byReason = await ModerationFlag.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const byStatus = await ModerationFlag.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const byFlagType = await ModerationFlag.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$flagType',
            count: { $sum: 1 }
          }
        }
      ]);

      // Unique flaggers
      const uniqueFlaggers = await ModerationFlag.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$flaggedBy',
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            uniqueCount: { $sum: 1 }
          }
        }
      ]);

      return {
        total,
        byReason: Object.fromEntries(byReason.map(r => [r._id, r.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byFlagType: Object.fromEntries(byFlagType.map(t => [t._id, t.count])),
        uniqueFlaggers: uniqueFlaggers[0]?.uniqueCount || 0,
        averagePerDay: (total / Math.max(1, Math.floor((new Date() - startDate) / (24 * 60 * 60 * 1000)))).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting flag metrics:', error);
      throw error;
    }
  }

  /**
   * Get review metrics
   */
  async getReviewMetrics(startDate) {
    try {
      // Reviewed items
      const reviewed = await ModerationQueue.countDocuments({
        reviewCompletedAt: { $gte: startDate }
      });

      // Decisions breakdown
      const decisions = await ModerationQueue.aggregate([
        {
          $match: { reviewCompletedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$decision',
            count: { $sum: 1 }
          }
        }
      ]);

      // Removal rate
      const removed = await ModerationQueue.countDocuments({
        reviewCompletedAt: { $gte: startDate },
        decision: 'removed'
      });

      const total = await ModerationQueue.countDocuments({
        reviewCompletedAt: { $gte: startDate }
      });

      // Appeals filed
      const appealed = await ModerationQueue.countDocuments({
        status: 'appealed',
        lastAppealAt: { $gte: startDate }
      });

      // Average review time
      const reviewTimes = await ModerationQueue.aggregate([
        {
          $match: {
            reviewCompletedAt: { $gte: startDate },
            reviewStartedAt: { $exists: true }
          }
        },
        {
          $project: {
            reviewTime: {
              $divide: [
                { $subtract: ['$reviewCompletedAt', '$reviewStartedAt'] },
                3600000 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$reviewTime' },
            maxTime: { $max: '$reviewTime' },
            minTime: { $min: '$reviewTime' }
          }
        }
      ]);

      return {
        totalReviewed: reviewed,
        decisions: Object.fromEntries(decisions.map(d => [d._id, d.count])),
        removalRate: total > 0 ? (removed / total * 100).toFixed(2) : 0,
        appealsField: appealed,
        reviewTimeHours: reviewTimes[0] ? {
          average: reviewTimes[0].avgTime?.toFixed(2) || 0,
          max: reviewTimes[0].maxTime?.toFixed(2) || 0,
          min: reviewTimes[0].minTime?.toFixed(2) || 0
        } : {
          average: 0,
          max: 0,
          min: 0
        }
      };
    } catch (error) {
      console.error('Error getting review metrics:', error);
      throw error;
    }
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(startDate) {
    try {
      // Pending items
      const pending = await ModerationQueue.countDocuments({
        status: 'pending',
        createdAt: { $gte: startDate }
      });

      // Average time to first assignment
      const assignmentTimes = await ModerationQueue.aggregate([
        {
          $match: {
            assignedAt: { $gte: startDate }
          }
        },
        {
          $project: {
            timeToAssign: {
              $divide: [
                { $subtract: ['$assignedAt', '$createdAt'] },
                3600000 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$timeToAssign' }
          }
        }
      ]);

      // Queue aged 7+ days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const aged = await ModerationQueue.countDocuments({
        createdAt: { $lte: sevenDaysAgo },
        reviewCompletedAt: { $exists: false }
      });

      // Throughput (items reviewed per day)
      const throughput = await ModerationQueue.aggregate([
        {
          $match: { reviewCompletedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$reviewCompletedAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: -1 }
        }
      ]);

      return {
        pendingItems: pending,
        agedItems: aged,
        avgHoursToAssign: assignmentTimes[0]?.avgTime?.toFixed(2) || 0,
        dailyThroughput: throughput,
        backlogSize: pending + aged
      };
    } catch (error) {
      console.error('Error getting efficiency metrics:', error);
      throw error;
    }
  }

  /**
   * Get per-moderator metrics
   */
  async getModeratorMetrics(startDate) {
    try {
      const metrics = await ModerationQueue.aggregate([
        {
          $match: {
            assignedModerator: { $exists: true, $ne: null },
            assignedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$assignedModerator',
            assigned: { $sum: 1 },
            reviewed: {
              $sum: {
                $cond: [{ $ne: ['$reviewCompletedAt', null] }, 1, 0]
              }
            },
            removed: {
              $sum: {
                $cond: [{ $eq: ['$decision', 'removed'] }, 1, 0]
              }
            },
            approved: {
              $sum: {
                $cond: [{ $eq: ['$decision', 'approved'] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            assigned: 1,
            reviewed: 1,
            removed: 1,
            approved: 1,
            removalRate: {
              $cond: [
                { $gt: ['$reviewed', 0] },
                {
                  $multiply: [
                    {
                      $divide: ['$removed', '$reviewed']
                    },
                    100
                  ]
                },
                0
              ]
            },
            reviewedPercentage: {
              $cond: [
                { $gt: ['$assigned', 0] },
                {
                  $multiply: [
                    {
                      $divide: ['$reviewed', '$assigned']
                    },
                    100
                  ]
                },
                0
              ]
            }
          }
        },
        { $sort: { reviewed: -1 } }
      ]);

      return metrics;
    } catch (error) {
      console.error('Error getting moderator metrics:', error);
      throw error;
    }
  }

  /**
   * Get trend metrics over time
   */
  async getTrendMetrics(startDate, granularity = 'day') {
    try {
      let dateFormat;
      if (granularity === 'week') {
        dateFormat = '%Y-W%V';
      } else if (granularity === 'month') {
        dateFormat = '%Y-%m';
      } else {
        dateFormat = '%Y-%m-%d';
      }

      const trends = await ModerationQueue.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: dateFormat, date: '$createdAt' }
            },
            flagged: { $sum: 1 },
            removed: {
              $sum: { $cond: [{ $eq: ['$decision', 'removed'] }, 1, 0] }
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$decision', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        granularity,
        data: trends
      };
    } catch (error) {
      console.error('Error getting trend metrics:', error);
      throw error;
    }
  }

  /**
   * Get content risk assessment
   */
  async getContentRiskAssessment() {
    try {
      const risky = await ModerationQueue.aggregate([
        {
          $group: {
            _id: '$contentId',
            flags: { $max: '$flagCount' },
            severity: { $max: '$severity' },
            status: { $first: '$status' }
          }
        },
        {
          $match: {
            $or: [
              { flags: { $gte: 3 } },
              { severity: { $in: ['high', 'critical'] } }
            ]
          }
        },
        { $sort: { flags: -1 } },
        { $limit: 20 }
      ]);

      return risky;
    } catch (error) {
      console.error('Error getting risk assessment:', error);
      throw error;
    }
  }
}

module.exports = new ModerationMetricsService();
