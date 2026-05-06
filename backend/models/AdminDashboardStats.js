/**
 * Admin Dashboard Model
 * Stores platform statistics and monitoring data
 */

const mongoose = require('mongoose');

const adminDashboardStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // User statistics
    totalUsers: {
      type: Number,
      default: 0,
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    suspendedUsers: {
      type: Number,
      default: 0,
    },

    // Content statistics
    totalContent: {
      type: Number,
      default: 0,
    },
    publishedContent: {
      type: Number,
      default: 0,
    },
    draftContent: {
      type: Number,
      default: 0,
    },
    deletedContent: {
      type: Number,
      default: 0,
    },

    // Transaction statistics
    totalTransactions: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    platformFees: {
      type: Number,
      default: 0,
    },
    creatorPayouts: {
      type: Number,
      default: 0,
    },

    // Moderation statistics
    flaggedContent: {
      type: Number,
      default: 0,
    },
    resolvedViolations: {
      type: Number,
      default: 0,
    },
    pendingModeration: {
      type: Number,
      default: 0,
    },

    // System statistics
    apiCallsCount: {
      type: Number,
      default: 0,
    },
    errorRate: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    systemHealth: {
      type: String,
      enum: ['HEALTHY', 'WARNING', 'CRITICAL'],
      default: 'HEALTHY',
    },

    // Backup statistics
    lastBackupDate: Date,
    backupStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
    collection: 'adminDashboardStats',
  }
);

adminDashboardStatsSchema.index({ date: -1 });

/**
 * Get latest statistics
 */
adminDashboardStatsSchema.statics.getLatestStats = async function () {
  return await this.findOne().sort({ createdAt: -1 });
};

/**
 * Get statistics for date range
 */
adminDashboardStatsSchema.statics.getStatsByDateRange = async function (
  startDate,
  endDate
) {
  return await this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: 1 });
};

/**
 * Update statistics
 */
adminDashboardStatsSchema.statics.updateStats = async function (updates) {
  try {
    const stats = new this(updates);
    return await stats.save();
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('AdminDashboardStats', adminDashboardStatsSchema);
