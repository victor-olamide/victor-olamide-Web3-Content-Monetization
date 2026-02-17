/**
 * Tier Change Log Model
 * 
 * Tracks all subscription tier changes for users
 * Provides audit trail and analytics for subscription transitions
 * 
 * @module models/TierChangeLog
 */

const mongoose = require('mongoose');

const tierChangeLogSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: String,
    required: true,
    index: true,
    description: 'ID of user who changed tier'
  },
  walletAddress: {
    type: String,
    default: null,
    index: true,
    description: 'Wallet address associated with the user'
  },
  
  // Subscription Tier Information
  oldSubscriptionTier: {
    type: String,
    required: true,
    description: 'Previous subscription tier name'
  },
  newSubscriptionTier: {
    type: String,
    required: true,
    description: 'New subscription tier name'
  },
  
  // Rate Limit Tier Information
  oldRateLimitTier: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise', 'admin'],
    required: true,
    index: true,
    description: 'Previous rate limit tier'
  },
  newRateLimitTier: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise', 'admin'],
    required: true,
    index: true,
    description: 'New rate limit tier'
  },
  
  // Change Type
  isUpgrade: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Whether this was an upgrade (higher tier)'
  },
  isDowngrade: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Whether this was a downgrade (lower tier)'
  },
  
  // Context Information
  creatorId: {
    type: String,
    default: null,
    description: 'Creator ID for multi-creator systems'
  },
  reason: {
    type: String,
    enum: [
      'subscription_change',
      'upgrade_request',
      'downgrade_request',
      'renewal_failed',
      'cancellation',
      'promotion',
      'admin_change',
      'trial_conversion',
      'other'
    ],
    default: 'subscription_change',
    index: true,
    description: 'Reason for the tier change'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional context data (promotional codes, reason, etc.)'
  },
  
  // Rate Limit Adjustments
  rateLimitAdjustments: {
    windowLimitBefore: { type: Number, default: null },
    windowLimitAfter: { type: Number, default: null },
    dailyLimitBefore: { type: Number, default: null },
    dailyLimitAfter: { type: Number, default: null },
    concurrentLimitBefore: { type: Number, default: null },
    concurrentLimitAfter: { type: Number, default: null },
    description: 'Specific rate limit changes'
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'When the tier change occurred'
  }
}, {
  timestamps: true,
  collection: 'tier_change_logs'
});

// Compound indexes for efficient querying
tierChangeLogSchema.index({ userId: 1, timestamp: -1 }, { name: 'user_timestamp_index' });
tierChangeLogSchema.index({ isUpgrade: 1, timestamp: -1 }, { name: 'upgrade_timestamp_index' });
tierChangeLogSchema.index({ isDowngrade: 1, timestamp: -1 }, { name: 'downgrade_timestamp_index' });
tierChangeLogSchema.index({ newRateLimitTier: 1, timestamp: -1 }, { name: 'tier_timestamp_index' });
tierChangeLogSchema.index({ reason: 1, timestamp: -1 }, { name: 'reason_timestamp_index' });
tierChangeLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-cleanup after 30 days

/**
 * Get tier change statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics object
 */
tierChangeLogSchema.statics.getUserStats = async function(userId) {
  try {
    const stats = await this.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalChanges: { $sum: 1 },
          upgrades: { $sum: { $cond: ['$isUpgrade', 1, 0] } },
          downgrades: { $sum: { $cond: ['$isDowngrade', 1, 0] } },
          lastChangeAt: { $max: '$timestamp' },
          mostCommonNewTier: { $push: '$newRateLimitTier' }
        }
      }
    ]);

    return stats[0] || {
      totalChanges: 0,
      upgrades: 0,
      downgrades: 0,
      lastChangeAt: null
    };
  } catch (error) {
    console.error('Error getting user stats:', error.message);
    return null;
  }
};

/**
 * Get global tier change statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Statistics object
 */
tierChangeLogSchema.statics.getGlobalStats = async function(options = {}) {
  try {
    const { startDate, endDate } = options;
    const match = {};

    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = startDate;
      if (endDate) match.timestamp.$lte = endDate;
    }

    const stats = await this.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalChanges: { $sum: 1 },
          totalUpgrades: { $sum: { $cond: ['$isUpgrade', 1, 0] } },
          totalDowngrades: { $sum: { $cond: ['$isDowngrade', 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          tierDistribution: {
            $push: { tier: '$newRateLimitTier', count: 1 }
          }
        }
      },
      {
        $project: {
          totalChanges: 1,
          totalUpgrades: 1,
          totalDowngrades: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          upgradeRate: {
            $divide: ['$totalUpgrades', '$totalChanges']
          }
        }
      }
    ]);

    return stats[0] || {
      totalChanges: 0,
      totalUpgrades: 0,
      totalDowngrades: 0,
      uniqueUserCount: 0,
      upgradeRate: 0
    };
  } catch (error) {
    console.error('Error getting global stats:', error.message);
    return null;
  }
};

/**
 * Get most recent tier change for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Most recent change or null
 */
tierChangeLogSchema.statics.getLatestChange = async function(userId) {
  try {
    return await this.findOne({ userId }).sort({ timestamp: -1 }).lean();
  } catch (error) {
    console.error('Error getting latest change:', error.message);
    return null;
  }
};

/**
 * Find users who recently upgraded
 * @param {number} minutesAgo - How many minutes ago (default: 60)
 * @returns {Promise<Array>} Array of users who upgraded
 */
tierChangeLogSchema.statics.getRecentUpgraders = async function(minutesAgo = 60) {
  try {
    const time = new Date(Date.now() - minutesAgo * 60 * 1000);
    return await this.find({
      isUpgrade: true,
      timestamp: { $gte: time }
    }).distinct('userId');
  } catch (error) {
    console.error('Error getting recent upgraders:', error.message);
    return [];
  }
};

module.exports = mongoose.model('TierChangeLog', tierChangeLogSchema);
