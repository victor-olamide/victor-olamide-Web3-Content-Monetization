const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const AdminDashboardStats = require('../models/AdminDashboardStats');
const mongoose = require('mongoose');

/**
 * Compute live platform-wide metrics and persist a snapshot to AdminDashboardStats.
 * Returns: totalUsers, totalRevenue, totalContent, activeSubscriptions + breakdowns.
 */
async function getPlatformStats() {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalContent,
    removedContent,
    activeSubscriptions,
    revenueAgg,
    purchasesToday,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    User.countDocuments({ isSuspended: true }),
    Content.countDocuments(),
    Content.countDocuments({ isRemoved: true }),
    Subscription.countDocuments({
      renewalStatus: { $in: ['active', 'expiring-soon'] },
      expiry: { $gte: now },
    }),
    Purchase.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
          creatorPayouts: { $sum: '$creatorAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
    Purchase.countDocuments({ timestamp: { $gte: last24h } }),
  ]);

  const revenue = revenueAgg[0] || {
    totalRevenue: 0,
    platformFees: 0,
    creatorPayouts: 0,
    totalTransactions: 0,
  };

  const snapshot = {
    date: now,
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalContent,
    publishedContent: totalContent - removedContent,
    deletedContent: removedContent,
    totalRevenue: revenue.totalRevenue,
    platformFees: revenue.platformFees,
    creatorPayouts: revenue.creatorPayouts,
    totalTransactions: revenue.totalTransactions,
    systemHealth: 'HEALTHY',
  };

  // Persist snapshot (non-fatal if it fails)
  try {
    await AdminDashboardStats.updateStats(snapshot);
  } catch (_) { /* ignore */ }

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      suspended: suspendedUsers,
    },
    content: {
      total: totalContent,
      active: totalContent - removedContent,
      removed: removedContent,
    },
    revenue: {
      total: revenue.totalRevenue,
      platformFees: revenue.platformFees,
      creatorPayouts: revenue.creatorPayouts,
      totalTransactions: revenue.totalTransactions,
    },
    subscriptions: {
      active: activeSubscriptions,
    },
    activity: {
      purchasesToday,
    },
    generatedAt: now,
  };
}

/**
 * Return the most recently persisted AdminDashboardStats snapshot.
 * Falls back to live computation if no snapshot exists.
 */
async function getLatestStats() {
  const cached = await AdminDashboardStats.getLatestStats();
  if (cached) return cached;
  return getPlatformStats();
}

/**
 * Return AdminDashboardStats snapshots for a date range.
 */
async function getStatsByDateRange(startDate, endDate) {
  return AdminDashboardStats.getStatsByDateRange(new Date(startDate), new Date(endDate));
}

/**
 * Purchases-by-day aggregation for the last 7 days.
 */
async function getMetrics() {
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const agg = await Purchase.aggregate([
    { $match: { timestamp: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return { purchasesLast7Days: agg };
}

/**
 * Overall platform status (lightweight — used by health-check style endpoints).
 */
async function getPlatformStatus() {
  const [purchasesToday, totalContents, totalUsers] = await Promise.all([
    Purchase.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    Content.countDocuments(),
    User.countDocuments(),
  ]);

  return {
    purchasesToday,
    totalContents,
    totalUsers,
    mongo: { readyState: mongoose.connection.readyState },
    timestamp: new Date(),
  };
}

/**
 * Rebuild key indexes (admin maintenance action).
 */
async function rebuildIndexes() {
  try {
    await Purchase.collection.createIndex({ timestamp: -1 }, { name: 'timestamp_index' });
    return { success: true, message: 'Indexes rebuilt' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getPlatformStats,
  getLatestStats,
  getStatsByDateRange,
  getMetrics,
  getPlatformStatus,
  rebuildIndexes,
};
