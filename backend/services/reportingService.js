/**
 * Reporting Service
 * Handles user flag/report submissions and management
 */

const ModerationFlag = require('../models/ModerationFlag');
const Content = require('../models/Content');
const ModerationQueue = require('../models/ModerationQueue');
const moderationService = require('./moderationService');
const { v4: uuidv4 } = require('uuid');

class ReportingService {
  /**
   * Submit a flag/report for content
   */
  async submitFlag(contentId, flagData) {
    try {
      const {
        flaggedBy,
        reason,
        description,
        evidence = {},
        userContact = {},
        ipAddress,
        userAgent
      } = flagData;

      // Validate content exists
      const content = await Content.findOne({ contentId });
      if (!content) {
        throw new Error(`Content ${contentId} not found`);
      }

      // Check for duplicate reports from same user within 24 hours
      const recentFlag = await ModerationFlag.findOne({
        contentId,
        flaggedBy: flaggedBy.toLowerCase(),
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (recentFlag) {
        throw new Error('You have already reported this content within the last 24 hours');
      }

      // Create flag record
      const flagId = `flag-${uuidv4()}`;
      const flag = new ModerationFlag({
        flagId,
        contentId,
        flaggedBy: flaggedBy.toLowerCase(),
        reason,
        description,
        evidence,
        severity: this.calculateSeverity(reason),
        status: 'submitted',
        userContact,
        ipAddress,
        reportMetadata: {
          userAgent,
          contentSnapshot: {
            title: content.title,
            creator: content.creator,
            contentType: content.contentType
          }
        }
      });

      await flag.save();

      // If this is not a duplicate flag, create or update queue
      const existingFlags = await ModerationFlag.find({
        contentId,
        flagId: { $ne: flagId },
        status: { $in: ['submitted', 'received', 'in-review'] }
      });

      // Create new queue entry if not exists, or merge flags
      let queue = await ModerationQueue.findOne({
        contentId,
        status: { $nin: ['approved', 'resolved'] }
      });

      if (!queue) {
        // Create new queue entry with this flag
        queue = await moderationService.createQueueEntry(
          contentId,
          [flag],
          {
            flagType: 'user-report'
          }
        );
      } else {
        // Merge into existing queue
        queue = await moderationService.mergeFlags(queue._id, [flag]);
      }

      return {
        flag,
        queue,
        message: 'Report submitted successfully. Our moderation team will review it shortly.'
      };
    } catch (error) {
      console.error('Error submitting flag:', error);
      throw error;
    }
  }

  /**
   * Get user's submitted flags
   */
  async getUserFlags(userAddress, options = {}) {
    try {
      const {
        status,
        limit = 20,
        skip = 0,
        sort = '-createdAt'
      } = options;

      let query = { flaggedBy: userAddress.toLowerCase() };

      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      const flags = await ModerationFlag.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationFlag.countDocuments(query);

      return {
        flags,
        total,
        limit,
        skip,
        hasMore: skip + flags.length < total
      };
    } catch (error) {
      console.error('Error fetching user flags:', error);
      throw error;
    }
  }

  /**
   * Get flag details
   */
  async getFlagDetails(flagId) {
    try {
      const flag = await ModerationFlag.findOne({ flagId });
      if (!flag) {
        throw new Error('Flag not found');
      }

      // Get related content and queue
      const content = await Content.findOne({ contentId: flag.contentId }).select('title contentType creator').lean();
      const queue = await ModerationQueue.findOne({ contentId: flag.contentId }).select('status decision queueId').lean();

      return {
        flag,
        content,
        queue
      };
    } catch (error) {
      console.error('Error fetching flag details:', error);
      throw error;
    }
  }

  /**
   * Get flags for a specific content
   */
  async getContentFlags(contentId, options = {}) {
    try {
      const {
        status,
        limit = 50,
        skip = 0,
        sort = '-createdAt'
      } = options;

      let query = { contentId };

      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      const flags = await ModerationFlag.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ModerationFlag.countDocuments(query);
      const reasons = {};

      // Count by reason
      flags.forEach(flag => {
        reasons[flag.reason] = (reasons[flag.reason] || 0) + 1;
      });

      return {
        flags,
        total,
        reasons,
        limit,
        skip,
        hasMore: skip + flags.length < total
      };
    } catch (error) {
      console.error('Error fetching content flags:', error);
      throw error;
    }
  }

  /**
   * Update flag status (for moderator)
   */
  async updateFlagStatus(flagId, status, reviewedBy, reviewNotes = '') {
    try {
      const flag = await ModerationFlag.findOne({ flagId });
      if (!flag) {
        throw new Error('Flag not found');
      }

      flag.status = status;
      flag.reviewedBy = reviewedBy.toLowerCase();
      flag.reviewedAt = new Date();
      flag.reviewNotes = reviewNotes;

      await flag.save();
      return flag;
    } catch (error) {
      console.error('Error updating flag status:', error);
      throw error;
    }
  }

  /**
   * Dismiss flag
   */
  async dismissFlag(flagId, moderatorAddress, reasonForDismissal) {
    try {
      const flag = await ModerationFlag.findOne({ flagId });
      if (!flag) {
        throw new Error('Flag not found');
      }

      flag.status = 'dismissed';
      flag.reviewedBy = moderatorAddress.toLowerCase();
      flag.reviewedAt = new Date();
      flag.reasonForDismissal = reasonForDismissal;

      await flag.save();
      return flag;
    } catch (error) {
      console.error('Error dismissing flag:', error);
      throw error;
    }
  }

  /**
   * Get flag analytics
   */
  async getAnalytics(options = {}) {
    try {
      const {
        timeRange = 30, // days
        groupBy = 'reason' // reason, status, contentType
      } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const query = {
        createdAt: { $gte: startDate }
      };

      // Group by requested field
      let groupField = '$reason';
      if (groupBy === 'status') {
        groupField = '$status';
      } else if (groupBy === 'contentType') {
        groupField = '$contentType';
      }

      const analytics = await MobilerationFlag.aggregate([
        { $match: query },
        {
          $group: {
            _id: groupField,
            count: { $sum: 1 },
            avgSeverity: { $avg: { $cond: [{ $eq: ['$severity', 'critical'] }, 4, { $cond: [{ $eq: ['$severity', 'high'] }, 3, { $cond: [{ $eq: ['$severity', 'medium'] }, 2, 1] }] } ] }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Trend data by day
      const trends = await ModerationFlag.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        period: `Last ${timeRange} days`,
        groupedBy: groupBy,
        summary: analytics,
        trends,
        totalFlags: analytics.reduce((sum, item) => sum + item.count, 0)
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get most flagged content
   */
  async getMostFlaggedContent(limit = 10) {
    try {
      const mostFlagged = await ModerationFlag.aggregate([
        {
          $group: {
            _id: '$contentId',
            flagCount: { $sum: 1 },
            reasons: { $push: '$reason' },
            lastFlagged: { $max: '$createdAt' }
          }
        },
        { $sort: { flagCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'contents',
            let: { contentId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$contentId', '$$contentId'] } } },
              { $project: { title: 1, creator: 1, contentType: 1 } }
            ],
            as: 'content'
          }
        }
      ]);

      return mostFlagged;
    } catch (error) {
      console.error('Error fetching most flagged content:', error);
      throw error;
    }
  }

  /**
   * Calculate severity based on reason
   */
  calculateSeverity(reason) {
    const criticalReasons = ['illegal-content', 'adult-content'];
    const highReasons = ['hate-speech', 'violence', 'harassment', 'copyright-violation'];

    if (criticalReasons.includes(reason)) {
      return 'critical';
    }
    if (highReasons.includes(reason)) {
      return 'high';
    }
    if (['misinformation', 'spam'].includes(reason)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Create automated flag for system-detected issues
   */
  async createAutomatedFlag(contentId, reason, details = '') {
    try {
      const flagId = `auto-${uuidv4()}`;
      const flag = new ModerationFlag({
        flagId,
        contentId,
        flaggedBy: 'system',
        flagType: 'automated-detection',
        reason,
        description: details,
        severity: this.calculateSeverity(reason),
        status: 'submitted'
      });

      await flag.save();

      // Create queue entry
      let queue = await ModerationQueue.findOne({
        contentId,
        status: { $nin: ['approved', 'resolved'] }
      });

      if (!queue) {
        queue = await moderationService.createQueueEntry(
          contentId,
          [flag],
          { flagType: 'automated-detection' }
        );
      } else {
        queue = await moderationService.mergeFlags(queue._id, [flag]);
      }

      return { flag, queue };
    } catch (error) {
      console.error('Error creating automated flag:', error);
      throw error;
    }
  }
}

module.exports = new ReportingService();
